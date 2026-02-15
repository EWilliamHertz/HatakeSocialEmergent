import { NextRequest, NextResponse } from 'next/server';
import { searchPokemonCards } from '@/lib/pokemon-api';
import { searchScryfallCards } from '@/lib/scryfall-api';

// Use edge runtime for faster response times
export const runtime = 'edge';

// Maximum results to return to prevent timeouts
const MAX_RESULTS = 50;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const game = searchParams.get('game') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), MAX_RESULTS);
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

    // Use Promise.all for parallel API calls when game='all'
    if (game === 'all') {
      const [pokemonResults, mtgResults] = await Promise.allSettled([
        searchPokemonCards(query, page, limit, setCode, cardNumber).catch(err => {
          console.error('Pokemon search error:', err);
          return { data: [], totalCount: 0 };
        }),
        searchScryfallCards(query, page).catch(err => {
          console.error('Scryfall search error:', err);
          return { data: [], total_cards: 0 };
        }),
      ]);

      if (pokemonResults.status === 'fulfilled' && pokemonResults.value) {
        const pokemonData = pokemonResults.value;
        results = [...results, ...pokemonData.data.slice(0, limit).map((card: any) => ({
          ...card,
          game: 'pokemon',
        }))];
        totalCount += pokemonData.totalCount || 0;
      }

      if (mtgResults.status === 'fulfilled' && mtgResults.value) {
        const scryfallData = mtgResults.value;
        results = [...results, ...scryfallData.data.slice(0, limit).map((card: any) => ({
          ...card,
          game: 'mtg',
        }))];
        totalCount += scryfallData.total_cards || 0;
      }
    } else if (game === 'pokemon') {
      try {
        const pokemonData = await searchPokemonCards(query, page, limit, setCode, cardNumber);
        results = pokemonData.data.slice(0, limit).map((card) => ({
          ...card,
          game: 'pokemon',
        }));
        totalCount = pokemonData.totalCount;
      } catch (error) {
        console.error('Pokemon search error:', error);
      }
    } else if (game === 'mtg') {
      try {
        const scryfallData = await searchScryfallCards(query, page);
        results = scryfallData.data.slice(0, limit).map((card) => ({
          ...card,
          game: 'mtg',
        }));
        totalCount = scryfallData.total_cards;
      } catch (error) {
        console.error('Scryfall search error:', error);
      }
    }

    // Final safeguard to limit results
    const limitedResults = results.slice(0, MAX_RESULTS);

    return NextResponse.json({
      success: true,
      results: limitedResults,
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