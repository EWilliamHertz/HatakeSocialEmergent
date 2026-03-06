import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// ScryDex API credentials (set in Vercel env vars)
const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY || '';
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID || '';
const SCRYDEX_BASE = 'https://api.scrydex.com';

/**
 * Build a ScryDex Japanese card ID from TCGdex data.
 * TCGdex: SV2a-168  → ScryDex: sv2a_ja-168
 * TCGdex: SV4A-091  → ScryDex: sv4a_ja-91
 */
function buildScryDexJaId(setId: string, localId: string): string {
  const set = setId.toLowerCase();
  const num = parseInt(localId, 10); // strip leading zeros
  return `${set}_ja-${num}`;
}

/**
 * Extract the best price from ScryDex variants[].prices[] response.
 * Returns { value, currency } so callers can convert JPY → USD if needed.
 * Handles both array and object price shapes, and string/number values.
 */
function extractScryDexPrice(variants: any[]): { value: number; currency: string } | null {
  if (!Array.isArray(variants)) return null;
  for (const variant of variants) {
    // Currency may be at variant level (e.g. "JPY" for JA market, "USD" for US)
    const variantCurrency = String(variant.currency || variant.priceCurrency || 'USD').toUpperCase();
    const pricesData = variant.prices;
    const prices: any[] = Array.isArray(pricesData)
      ? pricesData
      : (pricesData && typeof pricesData === 'object' ? Object.values(pricesData) : []);
    for (const p of prices) {
      const priceCurrency = String(p?.currency || variantCurrency).toUpperCase();
      const rawVal =
        p?.market ?? p?.marketPrice ?? p?.market_price ??
        p?.mid ?? p?.midPrice ?? p?.mid_price ??
        p?.low ?? p?.lowPrice ?? p?.low_price ??
        p?.value ?? p?.price ?? null;
      if (rawVal == null) continue;
      const val = parseFloat(String(rawVal));
      if (!isNaN(val) && val > 0) return { value: val, currency: priceCurrency };
    }
  }
  return null;
}

/** Convert a ScryDex price result to USD. JPY is divided by 150. */
function toUSD(result: { value: number; currency: string }): number {
  if (result.currency === 'JPY') return result.value / 150;
  return result.value; // assume USD already
}

/**
 * Search ScryDex for a JA card by expansion + number (fallback when direct ID fails).
 * Returns USD price (converts JPY → USD if needed).
 */
async function fetchScryDexJaPriceBySearch(expansionId: string, number: string): Promise<number | null> {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) return null;
  try {
    const url = `${SCRYDEX_BASE}/pokemon/v1/ja/cards?q=expansion.id:${expansionId} number:${number}&include=prices&pageSize=5`;
    const res = await fetch(url, {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const cards: any[] = json?.data ?? [];
    for (const card of cards) {
      const result = extractScryDexPrice(card?.variants ?? []);
      if (result !== null) return toUSD(result);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch price for a single Japanese card from ScryDex.
 * Returns price in USD (converts JPY → USD automatically).
 * Falls back to search-by-expansion if direct ID lookup returns no price.
 */
async function fetchScryDexJaPrice(scrydexId: string): Promise<number | null> {
  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) return null;
  try {
    const url = `${SCRYDEX_BASE}/pokemon/v1/ja/cards/${scrydexId}?include=prices`;
    const res = await fetch(url, {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const json = await res.json();
      const card = json?.data ?? json;
      const result = extractScryDexPrice(card?.variants ?? []);
      if (result !== null) {
        const usd = toUSD(result);
        if (usd > 0) return usd;
      }
    }
    // Fallback: search by expansion.id + number
    // scrydexId format: sv4a_ja-25 → expansionId=sv4a, number=25
    const match = scrydexId.match(/^(.+?)_ja-(\d+)$/);
    if (match) {
      return fetchScryDexJaPriceBySearch(match[1], match[2]);
    }
    return null;
  } catch {
    return null;
  }
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
    // Fetch full card detail for name
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
 * EN equivalent fallback: fetch CardMarket EUR price from pokemontcg.io.
 * Used when ScryDex lookup fails.
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
      lang: string;       // "ja" or "zh-tw"
      dexIds?: number[];
    }> = body.cards || [];

    if (cards.length === 0) {
      return NextResponse.json({ prices: {}, unavailableZh: [] });
    }

    // Separate ZH cards — Chinese pricing is not available
    const zhCards = cards.filter(c => c.lang === 'zh-tw' || c.lang === 'zh');
    const jaCards = cards.filter(c => c.lang !== 'zh-tw' && c.lang !== 'zh');

    const unavailableZhIds = zhCards.map(c => c.collectionId);

    if (jaCards.length === 0) {
      return NextResponse.json({ prices: {}, unavailableZh: unavailableZhIds });
    }

    // ------ 1. Check DB cache ------
    const cachedPrices: Record<number, number> = {};
    const uncached: typeof jaCards = [];

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const ids = jaCards.map(c => c.tcgdexId);
      const rows = await db.query(
        `SELECT tcgdex_id, price, updated_at FROM card_price_cache
         WHERE tcgdex_id = ANY($1) AND updated_at > $2`,
        [ids, sevenDaysAgo]
      );
      const cacheMap = new Map(rows.map((r: any) => [r.tcgdex_id, r.price]));

      for (const card of jaCards) {
        const cachedVal = cacheMap.get(card.tcgdexId);
        if (cachedVal !== null && cachedVal !== undefined) {
          // PostgreSQL NUMERIC columns come back as strings — always parse to float
          const parsed = parseFloat(String(cachedVal));
          if (!isNaN(parsed) && parsed > 0) {
            cachedPrices[card.collectionId] = parsed;
          } else {
            uncached.push(card);
          }
        } else {
          uncached.push(card);
        }
      }
    } catch {
      uncached.push(...jaCards);
    }

    if (uncached.length === 0) {
      return NextResponse.json({ prices: cachedPrices, unavailableZh: unavailableZhIds });
    }

    // ------ 2. Resolve dexIds for uncached cards (parallel) ------
    const resolvedCards = await Promise.all(
      uncached.map(async (card) => {
        const dashIdx = card.tcgdexId.lastIndexOf('-');
        if (dashIdx < 0) return { card, scrydexId: null, dexId: null };
        const setId = card.tcgdexId.slice(0, dashIdx);
        const localId = card.tcgdexId.slice(dashIdx + 1);

        const scrydexId = buildScryDexJaId(setId, localId);
        const dexId = await resolveDexId(card.tcgdexId, card.lang || 'ja', card.dexIds);

        return { card, scrydexId, dexId };
      })
    );

    const freshPrices: Record<number, number> = {};
    const cacheInserts: Array<{ tcgdexId: string; price: number; source: string }> = [];

    // ------ 3. ScryDex JA price lookup (US market / TCGPlayer prices) ------
    await Promise.all(
      resolvedCards.map(async (rc) => {
        if (!rc.scrydexId) return;

        const scrydexPrice = await fetchScryDexJaPrice(rc.scrydexId);
        if (scrydexPrice !== null && scrydexPrice > 0) {
          freshPrices[rc.card.collectionId] = scrydexPrice;
          cacheInserts.push({
            tcgdexId: rc.card.tcgdexId,
            price: scrydexPrice,
            source: `scrydex:${rc.scrydexId}`,
          });
        }
      })
    );

    // ------ 4. EN equivalent fallback (CardMarket EUR) for cards ScryDex couldn't price ------
    const needsFallback = resolvedCards.filter(
      rc => !(rc.card.collectionId in freshPrices) && rc.dexId !== null
    );

    await Promise.all(
      needsFallback.map(async (rc) => {
        if (!rc.dexId) return;
        const enPrice = await fetchEnEquivalentPrice(rc.dexId);
        if (enPrice !== null && enPrice > 0) {
          freshPrices[rc.card.collectionId] = enPrice;
          cacheInserts.push({
            tcgdexId: rc.card.tcgdexId,
            price: enPrice,
            source: `en-fallback:dexId:${rc.dexId}`,
          });
        }
      })
    );

    // ------ 5. Store in DB cache ------
    try {
      for (const { tcgdexId, price, source } of cacheInserts) {
        await db.query(
          `INSERT INTO card_price_cache (tcgdex_id, price, cm_url, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (tcgdex_id) DO UPDATE SET price=$2, cm_url=$3, updated_at=NOW()`,
          [tcgdexId, price, source]
        );
      }
    } catch (e) {
      console.error('Cache write error:', e);
    }

    return NextResponse.json({
      prices: { ...cachedPrices, ...freshPrices },
      unavailableZh: unavailableZhIds,
    });
  } catch (err: any) {
    console.error('Price API error:', err);
    return NextResponse.json({ error: err.message, prices: {}, unavailableZh: [] }, { status: 500 });
  }
}
