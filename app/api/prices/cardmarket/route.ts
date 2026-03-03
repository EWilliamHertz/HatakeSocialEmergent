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
 * ScryDex prices are TCGPlayer market prices (USD — US market).
 */
function extractScryDexPrice(variants: any[]): number | null {
  if (!Array.isArray(variants)) return null;
  for (const variant of variants) {
    const prices: any[] = Array.isArray(variant.prices) ? variant.prices : [];
    for (const p of prices) {
      // Try various possible field names
      const val =
        p?.market ?? p?.marketPrice ?? p?.market_price ??
        p?.mid ?? p?.midPrice ?? p?.mid_price ??
        p?.low ?? p?.lowPrice ?? p?.low_price ??
        p?.value ?? p?.price ?? null;
      if (val && typeof val === 'number' && val > 0) return val;
    }
  }
  return null;
}

/**
 * Fetch price for a single Japanese card from ScryDex.
 * Returns price in USD (US market / TCGPlayer).
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
    if (!res.ok) return null;
    const json = await res.json();
    const card = json?.data ?? json;
    return extractScryDexPrice(card?.variants ?? []);
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
          cachedPrices[card.collectionId] = cachedVal;
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
