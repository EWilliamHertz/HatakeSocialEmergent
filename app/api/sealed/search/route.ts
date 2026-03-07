import { NextRequest, NextResponse } from 'next/server';
import { fetchScrydex } from '@/lib/api-cache';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  // We rely on the frontend to trigger search, but we check if query exists
  if (!q || !q.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const query = q.trim();
    console.log(`[SealedSearch] Searching for: "${query}"`);

    // We fetch from the 'products' endpoint. 
    // We include prices to get market data for the portfolio.
    const data = await fetchScrydex('products', `q=${encodeURIComponent(query)}&include=prices`);

    // ScryDex can return results in .data, .products, or as a top-level array.
    const rawResults = data?.data || data?.products || (Array.isArray(data) ? data : null);

    if (!rawResults || !Array.isArray(rawResults)) {
      console.log(`[SealedSearch] No array results found for: "${query}"`, data);
      return NextResponse.json({ results: [] });
    }

    const results = rawResults.map((p: any) => {
      // 1. Determine the best image
      // ScryDex often provides an images array or a direct imageUrl
      const imageUrl = 
        p.images?.find((i: any) => i.type === 'front')?.medium ||
        p.images?.find((i: any) => i.type === 'front')?.url ||
        p.images?.[0]?.url ||
        p.imageUrl ||
        p.image ||
        null;

      // 2. Extract Price
      // Market price is usually in variants -> prices
      let price = 0;
      if (p.variants?.[0]?.prices?.[0]?.market) {
        price = parseFloat(p.variants[0].prices[0].market);
      } else if (p.price) {
        price = parseFloat(p.price);
      }

      return {
        id: p.id,
        name: p.name,
        // ScryDex uses productType or category for "Booster Box", "ETB", etc.
        type: p.productType || p.category || 'Sealed Product',
        imageUrl: imageUrl,
        price: price || 0,
        game: 'pokemon' // Currently ScryDex integration is Pokémon-focused
      };
    });

    console.log(`[SealedSearch] Found ${results.length} products for: "${query}"`);
    return NextResponse.json({ results });

  } catch (error) {
    console.error('[SealedSearch] error:', error);
    // Return empty results instead of crashing to keep the UI clean
    return NextResponse.json({ results: [], error: 'Search service unavailable' }, { status: 500 });
  }
}