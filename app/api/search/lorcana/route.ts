import { NextRequest, NextResponse } from 'next/server';

const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY || '';
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID || '';
const SCRYDEX_BASE = 'https://api.scrydex.com';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 50);

  if (!q) {
    return NextResponse.json({ cards: [] });
  }

  if (!SCRYDEX_API_KEY || !SCRYDEX_TEAM_ID) {
    return NextResponse.json(
      { error: 'Lorcana search requires SCRYDEX_API_KEY and SCRYDEX_TEAM_ID environment variables.', cards: [] },
      { status: 503 }
    );
  }

  try {
    // Search Lorcana cards by name using ScryDex Lucene query syntax
   const terms = q.split(/\s+/).filter(Boolean);
   const query = terms.map(t => `name:*${t}*`).join(' AND ');
   const url = `${SCRYDEX_BASE}/lorcana/v1/cards?q=${encodeURIComponent(query)}&pageSize=${pageSize}&include=prices&casing=camel`;

    const res = await fetch(url, {
      headers: {
        'X-Api-Key': SCRYDEX_API_KEY,
        'X-Team-ID': SCRYDEX_TEAM_ID,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('ScryDex Lorcana error:', res.status, text);
      return NextResponse.json({ error: `ScryDex returned ${res.status}`, cards: [] }, { status: res.status });
    }

    const json = await res.json();
    const rawCards: any[] = json?.data ?? [];

    /**
     * Extract the best price from a card's variants.
     * ScryDex Lorcana prices are TCGPlayer market prices (USD — US market).
     * Handles both numeric and string values.
     */
    function extractPrice(variants: any[]): number | null {
      if (!Array.isArray(variants)) return null;
      for (const variant of variants) {
        const pricesData = variant.prices;
        const prices: any[] = Array.isArray(pricesData)
          ? pricesData
          : (pricesData && typeof pricesData === 'object' ? Object.values(pricesData) : []);
        for (const p of prices) {
          const rawVal =
            p?.market ?? p?.marketPrice ?? p?.market_price ??
            p?.mid ?? p?.midPrice ?? p?.mid_price ??
            p?.low ?? p?.lowPrice ?? p?.low_price ??
            p?.value ?? p?.price ?? null;
          if (rawVal == null) continue;
          const val = parseFloat(String(rawVal));
          if (!isNaN(val) && val > 0) return val;
        }
      }
      return null;
    }

    const cards = rawCards.map((card: any) => {
      // Display name: "Name – Version" if version exists
      const displayName = card.version
        ? `${card.name} – ${card.version}`
        : card.name;

      // Best image
      const images = Array.isArray(card.images) ? card.images : [];
      const frontImage = images.find((i: any) => i.type === 'front') ?? images[0];

      // Price (USD, US market TCGPlayer)
      const price = extractPrice(card.variants ?? []);

      // Variants/finishes for adding to collection
      const finishes: string[] = (card.variants ?? []).map((v: any) => v.name).filter(Boolean);

      return {
        id: card.id,
        name: displayName,
        rawName: card.name,
        version: card.version || '',
        game: 'lorcana',
        rarity: card.rarity || 'Unknown',
        inkTypes: card.inkTypes ?? card.ink_types ?? [],
        supertype: card.supertype || 'Character',
        set_name: card.expansion?.name || '',
        set_code: card.expansion?.id || '',
        collector_number: card.number || '',
        image_uris: {
          small: frontImage?.small || null,
          normal: frontImage?.medium || null,
          large: frontImage?.large || null,
        },
        images: {
          small: frontImage?.small || null,
          large: frontImage?.large || null,
        },
        pricing: price ? { usd: price } : null,
        finishes,
      };
    });

    return NextResponse.json({ cards });
  } catch (err: any) {
    console.error('Lorcana search error:', err);
    return NextResponse.json({ error: err.message, cards: [] }, { status: 500 });
  }
}