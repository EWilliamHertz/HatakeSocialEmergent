import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// Map TCGdex set ID (uppercase) → CardMarket set slug
const CM_SET_SLUGS: Record<string, string> = {
  // Japanese Scarlet & Violet era
  'SV1S':  'Scarlet-ex',
  'SV1V':  'Violet-ex',
  'SV1A':  'Triplet-Beat',
  'SV2P':  'Snow-Hazard',
  'SV2D':  'Clay-Burst',
  'SV2A':  'Pokemon-Card-151',
  'SV3':   'Ruler-of-the-Black-Flame',
  'SV3A':  'Raging-Surf',
  'SV4K':  'Ancient-Roar',
  'SV4M':  'Future-Flash',
  'SV4A':  'Shiny-Treasure-ex',
  'SV5K':  'Wild-Force',
  'SV5M':  'Cyber-Judge',
  'SV5A':  'Crimson-Haze',
  'SV6':   'Mask-of-Change',
  'SV6A':  'Night-Wanderer',
  'SV7':   'Stellar-Miracle',
  'SV7A':  'Paradise-Dragona',
  'SV8':   'Surging-Sparks',
  'SV8A':  'Terastal-Festival-ex',
  'SV9':   'Battle-Partners',
  'SV9A':  'Inferno-Arena',
  'SV10':  'Destined-Rivals',
  'SV11W': 'White-Flare',
  // Traditional Chinese sets (ZH-TW usually same set slugs)
  'SVZH1': 'Scarlet-Violet-Simplified-Chinese-Promos',
};

/** Build a CardMarket single-card URL from TCGdex card data */
function buildCmUrl(setId: string, localId: string, enName: string): string[] {
  const key = setId.toUpperCase();
  const cmSlug = CM_SET_SLUGS[key];
  if (!cmSlug) return [];

  const setCode = setId.toLowerCase();
  const num = String(parseInt(localId)).padStart(3, '0');

  const nameKebab = enName
    .replace(/[''`]/g, '')
    .replace(/[^a-zA-Z0-9\s\-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  const base = `https://www.cardmarket.com/en/Pokemon/Products/Singles/${cmSlug}/${nameKebab}-${setCode}${num}`;
  return [base, `${nameKebab}-V1-${setCode}${num}`, `${nameKebab}-V2-${setCode}${num}`].map(
    (slug, i) => i === 0 ? base : `https://www.cardmarket.com/en/Pokemon/Products/Singles/${cmSlug}/${slug.split('/').pop()}`
  );
}

/** Extract Price Trend (or 30d avg) from Apify scraper result info array */
function extractPrice(item: any): number | null {
  if (!item?.info || !Array.isArray(item.info)) return null;
  const keys = ['30-days average price', '7-days average price', 'Price Trend', 'From'];
  for (const key of keys) {
    const entry = item.info.find((i: any) => i.key === key);
    if (entry?.data?.price && typeof entry.data.price === 'number') {
      return entry.data.price;
    }
  }
  return null;
}

/** Fetch English card name from TCGdex using dexId */
async function fetchEnglishName(dexId: number): Promise<string | null> {
  try {
    const r = await fetch(`https://api.tcgdex.net/v2/en/cards?dexId=eq:${dexId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const cards = await r.json();
    if (!Array.isArray(cards) || cards.length === 0) return null;
    if (cards[0].name) return cards[0].name as string;
    const full = await fetch(`https://api.tcgdex.net/v2/en/cards/${cards[0].id}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!full.ok) return null;
    const data = await full.json();
    return data.name || null;
  } catch {
    return null;
  }
}

/** Resolve dexId for a card — either use what was provided or fetch from TCGdex */
async function resolveDexId(tcgdexId: string, lang: string, providedDexIds?: number[]): Promise<number | null> {
  if (providedDexIds && providedDexIds.length > 0) return providedDexIds[0];
  try {
    const r = await fetch(`https://api.tcgdex.net/v2/${lang}/cards/${tcgdexId}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const detail = await r.json();
    const ids: number[] = Array.isArray(detail.dexId)
      ? detail.dexId
      : (detail.dexId ? [detail.dexId] : []);
    return ids[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch EN equivalent CardMarket price from pokemontcg.io (free, no key needed).
 * Returns the best EUR CardMarket price found for any English print of this Pokémon.
 */
async function fetchEnEquivalentPrice(dexId: number): Promise<number | null> {
  try {
    const r = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=nationalPokedexNumbers:${dexId}&pageSize=20`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!r.ok) return null;
    const data = await r.json();
    const cards: any[] = data.data || [];
    // Find best CardMarket EUR price across all English prints
    let best: number | null = null;
    for (const card of cards) {
      const cm = card.cardmarket?.prices;
      if (!cm) continue;
      const price = cm.averageSellPrice || cm.trendPrice || cm.avg1;
      if (price && price > 0) {
        if (best === null || price > best) best = price;
      }
    }
    return best;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cards: Array<{
      collectionId: number;
      tcgdexId: string;   // e.g. "SV2a-168"
      lang: string;
      dexIds?: number[];
    }> = body.cards || [];

    if (cards.length === 0) {
      return NextResponse.json({ prices: {} });
    }

    const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

    // ------ 1. Check DB cache ------
    const cachedPrices: Record<number, number | null> = {};
    const uncached: typeof cards = [];

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const ids = cards.map(c => c.tcgdexId);
      const rows = await db.query(
        `SELECT tcgdex_id, price, updated_at FROM card_price_cache
         WHERE tcgdex_id = ANY($1) AND updated_at > $2`,
        [ids, sevenDaysAgo]
      );
      const cacheMap = new Map(rows.map((r: any) => [r.tcgdex_id, r.price]));

      for (const card of cards) {
        if (cacheMap.has(card.tcgdexId)) {
          // Only include cached prices that are non-null (null means "known no-price" — skip)
          const cachedVal = cacheMap.get(card.tcgdexId);
          if (cachedVal !== null && cachedVal !== undefined) {
            cachedPrices[card.collectionId] = cachedVal;
          } else {
            // Cached as null → treat as uncached so we try EN fallback fresh
            uncached.push(card);
          }
        } else {
          uncached.push(card);
        }
      }
    } catch {
      uncached.push(...cards);
    }

    if (uncached.length === 0) {
      return NextResponse.json({ prices: cachedPrices });
    }

    // ------ 2. Resolve dexIds + English names for uncached cards (parallel) ------
    const resolvedCards = await Promise.all(
      uncached.map(async (card) => {
        const dashIdx = card.tcgdexId.lastIndexOf('-');
        if (dashIdx < 0) return { card, url: null, dexId: null, enName: null };
        const setId = card.tcgdexId.slice(0, dashIdx);
        const localId = card.tcgdexId.slice(dashIdx + 1);

        const dexId = await resolveDexId(card.tcgdexId, card.lang || 'ja', card.dexIds);
        const enName = dexId ? await fetchEnglishName(dexId) : null;

        // Only build CM URL if set has a slug
        let url: string | null = null;
        if (CM_SET_SLUGS[setId.toUpperCase()] && enName) {
          const urls = buildCmUrl(setId, localId, enName);
          url = urls[0] || null;
        }

        return { card, url, dexId, enName };
      })
    );

    const freshPrices: Record<number, number> = {};
    const cacheInserts: Array<{ tcgdexId: string; price: number; cmUrl: string }> = [];

    // ------ 3. Run Apify scraper if token is available ------
    if (APIFY_TOKEN) {
      const urlToResolved = new Map<string, typeof resolvedCards[0]>();
      for (const rc of resolvedCards) {
        if (rc.url) urlToResolved.set(rc.url, rc);
      }

      const urlsToScrape = Array.from(urlToResolved.keys());

      if (urlsToScrape.length > 0) {
        try {
          const apifyRes = await fetch(
            `https://api.apify.com/v2/acts/ecomscrape~cardmarket-card-page-details-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                urls: urlsToScrape,
                max_retries_per_url: 2,
                proxy: { useApifyProxy: true },
              }),
              signal: AbortSignal.timeout(130_000),
            }
          );

          if (apifyRes.ok) {
            const scrapedItems: any[] = await apifyRes.json();
            const successfulIds = new Set<number>();

            for (const item of scrapedItems) {
              const url = item.url as string;
              if (!url) continue;
              const rc = urlToResolved.get(url);
              if (!rc) continue;

              const price = extractPrice(item);
              if (price !== null && price > 0) {
                freshPrices[rc.card.collectionId] = price;
                successfulIds.add(rc.card.collectionId);
                cacheInserts.push({ tcgdexId: rc.card.tcgdexId, price, cmUrl: url });
              }
            }

            // For cards Apify couldn't price, fall through to EN fallback below
            resolvedCards.forEach(rc => {
              if (!successfulIds.has(rc.card.collectionId)) {
                // Will be handled by EN fallback
              }
            });
          }
        } catch (apifyErr) {
          console.error('Apify call failed, using EN fallback:', apifyErr);
        }
      }
    }

    // ------ 4. EN equivalent fallback for cards not yet priced ------
    // Covers: no APIFY_TOKEN, Apify failure, Apify returned no price for a card
    const needsEnFallback = resolvedCards.filter(
      rc => !(rc.card.collectionId in freshPrices) && rc.dexId !== null
    );

    await Promise.all(
      needsEnFallback.map(async (rc) => {
        if (!rc.dexId) return;
        const enPrice = await fetchEnEquivalentPrice(rc.dexId);
        if (enPrice !== null && enPrice > 0) {
          freshPrices[rc.card.collectionId] = enPrice;
          // Cache with a shorter TTL marker by using a special prefix? No — just cache normally.
          // We cache EN fallback prices too, to avoid re-fetching every page load.
          cacheInserts.push({
            tcgdexId: rc.card.tcgdexId,
            price: enPrice,
            cmUrl: `en-fallback:dexId:${rc.dexId}`,
          });
        }
      })
    );

    // ------ 5. Store in DB cache (only real prices, not nulls) ------
    try {
      for (const { tcgdexId, price, cmUrl } of cacheInserts) {
        await db.query(
          `INSERT INTO card_price_cache (tcgdex_id, price, cm_url, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (tcgdex_id) DO UPDATE SET price=$2, cm_url=$3, updated_at=NOW()`,
          [tcgdexId, price, cmUrl]
        );
      }
    } catch (e) {
      console.error('Cache write error:', e);
    }

    return NextResponse.json({ prices: { ...cachedPrices, ...freshPrices } });
  } catch (err: any) {
    console.error('CardMarket price API error:', err);
    return NextResponse.json({ error: err.message, prices: {} }, { status: 500 });
  }
}
