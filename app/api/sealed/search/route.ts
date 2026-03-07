// app/api/sealed/search/route.ts
import { NextResponse } from 'next/server';
import { searchSealedProducts } from '@/lib/sealed-api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query   = searchParams.get('q') || '';
  const setCode = searchParams.get('setCode') || undefined;
  const page    = parseInt(searchParams.get('page')  || '1');
  const limit   = parseInt(searchParams.get('limit') || '50');
  const lang    = searchParams.get('lang') || undefined;

  try {
    const result = await searchSealedProducts(query, page, limit, setCode, lang);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Sealed Route Error:', error);
    return NextResponse.json({ data: [], totalCount: 0 }, { status: 500 });
  }
}
