// app/api/sealed/search/route.ts
import { NextResponse } from 'next/server';
import { searchSealedProducts } from '@/lib/sealed-api';

function extractSealedPrice(variants: any[]): number {
  if (!Array.isArray(variants)) return 0;
  for (const variant of variants) {
    const prices = Array.isArray(variant.prices) ? variant.prices : Object.values(variant.prices || {});
    for (const p of prices as any[]) {
      const val = p?.market ?? p?.mid ?? p?.low ?? p?.price ?? null;
      if (val != null && parseFloat(String(val)) > 0) return parseFloat(String(val));
    }
  }
  return 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const setCode = searchParams.get('setCode') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    const result = await searchSealedProducts(query, page, limit, setCode);

    // Map raw ScryDex sealed products to the shape the UI expects:
    // { id, name, type, imageUrl, price }
    const mapped = (result.data || []).map((product: any) => {
      const images = Array.isArray(product.images) ? product.images : [];
      const frontImage = images.find((i: any) => i.type === 'front') ?? images[0];
      const priceUsd = extractSealedPrice(product.variants ?? []);
      // Convert USD → EUR (approx 0.92)
      const priceEur = priceUsd > 0 ? parseFloat((priceUsd * 0.92).toFixed(2)) : 0;

      return {
        id: product.id,
        name: product.name,
        type: product.type || product.productType || 'Sealed Product',
        imageUrl: frontImage?.small || frontImage?.medium || '',
        price: priceEur,
        expansion: product.expansion,
      };
    });

    // Return as 'data' AND as 'results' so either consumer works
    return NextResponse.json({ data: mapped, results: mapped, totalCount: result.totalCount });
  } catch (error) {
    return NextResponse.json({ data: [], results: [], totalCount: 0 }, { status: 500 });
  }
}
