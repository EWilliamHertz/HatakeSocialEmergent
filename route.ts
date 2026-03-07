import { NextRequest, NextResponse } from 'next/server';
import { fetchScrydex } from '@/lib/api-cache';

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q');
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await fetchScrydex('products', `q=${encodeURIComponent(q.trim())}&include=prices`);

    if (!data?.data) {
      return NextResponse.json({ results: [] });
    }

    const results = (data.data as any[]).map((p) => ({
      id: p.id,
      name: p.name,
      // ScryDex uses productType or category depending on API version
      type: p.productType || p.category || 'Sealed Product',
      // Prefer a medium-sized front image; fall back to first available
      imageUrl:
        p.images?.find((i: any) => i.type === 'front')?.medium ||
        p.images?.[0]?.url ||
        p.imageUrl ||
        null,
      // Market price from first variant's first price entry
      price: p.variants?.[0]?.prices?.[0]?.market ?? p.price ?? 0,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Sealed search error:', error);
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}
