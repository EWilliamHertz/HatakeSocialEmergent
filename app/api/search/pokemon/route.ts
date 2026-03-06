import { NextRequest, NextResponse } from 'next/server';
import { searchPokemonCards } from '@/lib/pokemon-api';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '2000'), 5000);
  const setCode = searchParams.get('set') || undefined;
  const cardNumber = searchParams.get('number') || undefined;
  // Forward the lang param so language filters (en / ja / en,ja) are respected
  const lang = searchParams.get('lang') || undefined;

  try {
    const result = await searchPokemonCards(q, page, pageSize, setCode, cardNumber, lang);
    
    // Ensure game: 'pokemon' is added to each card for the frontend
    const cards = result.data.map(card => ({
      ...card,
      game: 'pokemon'
    }));

    return NextResponse.json({ 
      cards,
      totalCount: result.totalCount 
    });
  } catch (err: any) {
    console.error('Pokemon search API error:', err);
    return NextResponse.json({ error: err.message, cards: [] }, { status: 500 });
  }
}
