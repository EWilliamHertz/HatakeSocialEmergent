import { NextRequest, NextResponse } from 'next/server';
import { searchPokemonCards } from '@/lib/pokemon-api';
import { searchScryfallCards } from '@/lib/scryfall-api';
import sql from '@/lib/db';

const SCRYDEX_API_KEY = process.env.SCRYDEX_API_KEY || '';
const SCRYDEX_TEAM_ID = process.env.SCRYDEX_TEAM_ID || '';
const SCRYDEX_BASE = 'https://api.scrydex.com';

// Maximum results to return to prevent timeouts
const MAX_RESULTS = 200;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const game = searchParams.get('game') || 'all';
    const searchType = searchParams.get('type') || 'cards'; // cards, users, all
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), MAX_RESULTS);
    const cardNumber = searchParams.get('number') || undefined;
    const setCode = searchParams.get('set') || undefined;
    const lang = searchParams.get('lang') || undefined;
    
    // Allow search without query if set or number is provided (for cards only)
    if (!query && !setCode && !cardNumber) {
      return NextResponse.json(
        { error: 'Query parameter, set code, or card number is required' },
        { status: 400 }
      );
    }

    let results: any[] = [];
    let totalCount = 0;
    let users: any[] = [];
    let posts: any[] = [];
    let decks: any[] = [];

    // Search users, posts, decks if searchType is 'all' or specific type
    if (query && (searchType === 'all' || searchType === 'users')) {
      try {
        const userResults = await sql`
          SELECT user_id, name, email, picture
          FROM users
          WHERE LOWER(name) LIKE ${`%${query.toLowerCase()}%`}
          LIMIT 10
        `;
        users = userResults.map(u => ({
          ...u,
          type: 'user'
        }));
      } catch (e) {
        console.error('User search error:', e);
      }
    }

    if (query && (searchType === 'all' || searchType === 'posts')) {
      try {
        const postResults = await sql`
          SELECT p.post_id, p.content, p.created_at, u.user_id, u.name, u.picture
          FROM posts p
          JOIN users u ON p.user_id = u.user_id
          WHERE LOWER(p.content) LIKE ${`%${query.toLowerCase()}%`}
          ORDER BY p.created_at DESC
          LIMIT 10
        `;
        posts = postResults.map(p => ({
          ...p,
          type: 'post'
        }));
      } catch (e) {
        console.error('Post search error:', e);
      }
    }

    if (query && (searchType === 'all' || searchType === 'decks')) {
      try {
        const deckResults = await sql`
          SELECT d.deck_id, d.name, d.description, d.format, d.created_at, u.user_id, u.name as creator_name, u.picture as creator_picture
          FROM decks d
          JOIN users u ON d.user_id = u.user_id
          WHERE LOWER(d.name) LIKE ${`%${query.toLowerCase()}%`}
          ORDER BY d.created_at DESC
          LIMIT 10
        `;
        decks = deckResults.map(d => ({
          ...d,
          type: 'deck'
        }));
      } catch (e) {
        console.error('Deck search error:', e);
      }
    }

    // Search cards if searchType is 'all' or 'cards'
    if (searchType === 'all' || searchType === 'cards') {
      // Use Promise.all for parallel API calls when game='all'
      if (game === 'all') {
        const searchPromises: Promise<any>[] = [
          // Pokemon: Now uses global /cards endpoint and Lucene language filters
          searchPokemonCards(query, page, limit, setCode, cardNumber, lang).catch(err => {
            console.error('Pokemon search error:', err);
            return { data: [], totalCount: 0 };
          }),
          searchScryfallCards(query, page).catch(err => {
            console.error('Scryfall search error:', err);
            return { data: [], total_cards: 0 };
          }),
        ];

        // Add Lorcana if credentials exist
        if (SCRYDEX_API_KEY && SCRYDEX_TEAM_ID && query) {
          const lorcanaSearch = async () => {
            try {
              const terms = query.split(/\s+/).filter(Boolean);
              const luceneQuery = terms.map(t => `name:${t}*`).join(' AND ');
              const res = await fetch(`${SCRYDEX_BASE}/lorcana/v1/cards?q=${encodeURIComponent(luceneQuery)}&pageSize=${limit}&include=prices&casing=camel`, {
                headers: { 'X-Api-Key': SCRYDEX_API_KEY, 'X-Team-ID': SCRYDEX_TEAM_ID },
                signal: AbortSignal.timeout(10000)
              });
              if (!res.ok) return { cards: [] };
              const json = await res.json();
              return { cards: json.data || [], total: json.total || 0 };
            } catch (e) {
              console.error('Lorcana search error in all:', e);
              return { cards: [] };
            }
          };
          searchPromises.push(lorcanaSearch());
        }

        const settleResults = await Promise.allSettled(searchPromises);

        // 0: Pokemon
        if (settleResults[0].status === 'fulfilled' && settleResults[0].value) {
          const pokemonData = settleResults[0].value;
          results = [...results, ...pokemonData.data.slice(0, limit).map((card: any) => ({
            ...card,
            game: 'pokemon',
          }))];
          totalCount += pokemonData.totalCount || 0;
        }

        // 1: MTG
        if (settleResults[1].status === 'fulfilled' && settleResults[1].value) {
          const scryfallData = settleResults[1].value;
          results = [...results, ...scryfallData.data.slice(0, limit).map((card: any) => ({
            ...card,
            game: 'mtg',
          }))];
          totalCount += scryfallData.total_cards || 0;
        }

        // 2: Lorcana
        if (settleResults[2]?.status === 'fulfilled' && settleResults[2].value) {
          const lorcanaData = settleResults[2].value;
          results = [...results, ...lorcanaData.cards.slice(0, limit).map((card: any) => {
            const images = Array.isArray(card.images) ? card.images : [];
            const frontImage = images.find((i: any) => i.type === 'front') ?? images[0];
            return {
              ...card,
              game: 'lorcana',
              image_uris: {
                small: frontImage?.small || null,
                normal: frontImage?.medium || null,
                large: frontImage?.large || null,
              },
              images: {
                small: frontImage?.small || null,
                large: frontImage?.large || null,
              }
            };
          })];
          totalCount += lorcanaData.total || 0;
        }
      } else if (game === 'pokemon') {
        try {
          const pokemonData = await searchPokemonCards(query, page, limit, setCode, cardNumber, lang);
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
    }

    // Final safeguard to limit results
    const limitedResults = results.slice(0, MAX_RESULTS);

    return NextResponse.json({
      success: true,
      results: limitedResults,
      users,
      posts,
      decks,
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