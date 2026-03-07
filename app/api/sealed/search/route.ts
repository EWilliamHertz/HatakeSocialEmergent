import { NextRequest, NextResponse } from 'next/server';
import { searchPokemonProducts } from '@/lib/sealed-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  
  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = await searchPokemonProducts(q);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}