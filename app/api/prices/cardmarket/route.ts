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

  // setId in URL is lowercase as-is: sv2a, sv4k, etc.
  const setCode = setId.toLowerCase();
  const num = String(parseInt(localId)).padStart(3, '0');

  // Sanitize English name → kebab
  const nameKebab = enName
    .replace(/[''`]/g, '')
    .replace(/[^a-zA-Z0-9\s\-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  const base = `https://www.cardmarket.com/en/Pokemon/Products/Singles/${cmSlug}/${nameKebab}-${setCode}${num}`;
  // Return base URL plus versioned fallbacks (V1, V2, V3)
  return [base, `${nameKebab}-V1-${setCode}${num}`, `${nameKebab}-V2-${setCode}${num}`].map(
    (slug, i) => i === 0 ? base : `https://www.cardmarket.com/en/Pokemon/Products/Singles/${cmSlug}/${slug.split('/').pop()}`
  );
}

/** Extract Price Trend (or 30d avg) from Apify scraper result info array */
function extractPrice(item: any): number | null {
  if (!item?.info || !Array.isArray(item.info)) return null;
  // Prefer 30-day average, fall back to Price Trend, then "From" price
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
    const r = await fetch(`https://api.tcgdex.net/v2/en/cards?dexId=eq:${dexId}&limit=1`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const cards = await r.json();
    if (!Array.isArray(cards) || cards.length === 0) return null;
    // Fetch full card for name
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cards: Array<{
      collectionId: number;
      tcgdexId: string;   // e.g. "sv2a-168"
      lang: string;
      dexIds?: number[];
    }> = body.cards || [];

    if (cards.length === 0) {
      return NextResponse.json({ prices: {} });
    }

    const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
    if (!APIFY_TOKEN) {
      return NextResponse.json(
        { error: 'APIFY_API_TOKEN not configured', prices: {} },
        { status: 503 }
      );
    }

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
          cachedPrices[card.collectionId] = cacheMap.get(card.tcgdexId);
        } else {
          uncached.push(card);
        }
      }
    } catch {
      // Table might not exist yet — treat all as uncached
      uncached.push(...cards);
    }

    if (uncached.length === 0) {
      return NextResponse.json({ prices: cachedPrices });
    }

    // ------ 2. Build CardMarket URLs for uncached cards ------
    const urlToCard = new Map<string, (typeof cards)[0]>();

    for (const card of uncached) {
      // Parse "sv2a-168" → setId="sv2a", localId="168"
      const dashIdx = card.tcgdexId.lastIndexOf('-');
      if (dashIdx < 0) continue;
      const setId = card.tcgdexId.slice(0, dashIdx);
      const localId = card.tcgdexId.slice(dashIdx + 1);

      // Get English name via dexId
      const dexId = card.dexIds?.[0];
      if (!dexId) continue; // skip non-Pokémon cards for now

      const enName = await fetchEnglishName(dexId);
      if (!enName) continue;

      const urls = buildCmUrl(setId, localId, enName);
      if (urls.length === 0) continue;

      // Use the primary URL; store mapping
      urlToCard.set(urls[0], card);
    }

    const urlsToScrape = Array.from(urlToCard.keys());
    if (urlsToScrape.length === 0) {
      return NextResponse.json({ prices: cachedPrices });
    }

    // ------ 3. Run Apify scraper ------
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

    if (!apifyRes.ok) {
      const errText = await apifyRes.text();
      console.error('Apify error:', errText);
      return NextResponse.json({ prices: cachedPrices, apifyError: errText });
    }

    const scrapedItems: any[] = await apifyRes.json();

    // ------ 4. Map results back to collection IDs ------
    const freshPrices: Record<number, number | null> = {};
    const cacheInserts: Array<{ tcgdexId: string; price: number | null; cmUrl: string }> = [];

    for (const item of scrapedItems) {
      const url = item.url as string;
      if (!url) continue;
      const card = urlToCard.get(url);
      if (!card) continue;

      const price = extractPrice(item);
      freshPrices[card.collectionId] = price;
      cacheInserts.push({ tcgdexId: card.tcgdexId, price, cmUrl: url });
    }

    // ------ 5. Store in DB cache ------
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
