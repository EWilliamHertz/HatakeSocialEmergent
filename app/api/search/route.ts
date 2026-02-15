import { NextRequest, NextResponse } from 'next/server';
import { searchPokemonCards } from '@/lib/pokemon-api';
import { searchScryfallCards } from '@/lib/scryfall-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const game = searchParams.get('game') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const setCode = searchParams.get('set') || undefined;
    const cardNumber = searchParams.get('number') || undefined;

    // Allow search without query if set or number is provided
    if (!query && !setCode && !cardNumber) {
      return NextResponse.json(
        { error: 'Query parameter, set code, or card number is required' },
        { status: 400 }
      );
    }

    let results: any[] = [];
    let totalCount = 0;

    if (game === 'pokemon' || game === 'all') {
      try {
        const pokemonData = await searchPokemonCards(query, page, limit, setCode, cardNumber);
        results = [
          ...results,
          ...pokemonData.data.map((card) => ({
            ...card,
            game: 'pokemon',
          })),
        ];
        totalCount += pokemonData.totalCount;
      } catch (error) {
        console.error('Pokemon search error:', error);
      }
    }

    if (game === 'mtg' || game === 'all') {
      try {
        const scryfallData = await searchScryfallCards(query, page);
        results = [
          ...results,
          ...scryfallData.data.map((card) => ({
            ...card,
            game: 'mtg',
          })),
        ];
        totalCount += scryfallData.total_cards;
      } catch (error) {
        console.error('Scryfall search error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      totalCount,
      page,
      limit,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}