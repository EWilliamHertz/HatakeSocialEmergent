import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

const CRON_SECRET = process.env.CRON_SECRET || 'hatake-price-update-2026';

// Convert TCGdex set ID format (sv01-247) to pokemontcg.io format (sv1-247)
// pokemontcg.io drops the leading zero from the set number
function tcgdexToPokemontcgId(cardId: string): string {
  // Match pattern: letters + optional zeros + digits + dash + rest
  const match = cardId.match(/^([a-zA-Z]+)0*(\d+)-(.+)$/);
  if (match) {
    return `${match[1]}${match[2]}-${match[3]}`;
  }
  return cardId;
}

async function fetchPokemonPrice(cardId: string): Promise<number> {
  const altId = tcgdexToPokemontcgId(cardId);
  const idsToTry = Array.from(new Set([cardId, altId]));

  for (const id of idsToTry) {
    try {
      const res = await fetch(`https://api.pokemontcg.io/v2/cards/${id}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const price = data.data?.cardmarket?.prices?.averageSellPrice;
        if (price && price > 0) return parseFloat(price);
      }
    } catch {
      // Try next ID format
    }
  }
  return 0;
}

async function fetchMagicPrice(cardId: string): Promise<number> {
  try {
    const res = await fetch(`https://api.scryfall.com/cards/${cardId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data.prices?.eur || '0');
      return isNaN(price) ? 0 : price;
    }
  } catch {
    // Return 0 on error
  }
  return 0;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // Get all unique card+game combos across all users
    const allCards = await sql`
      SELECT DISTINCT card_id, game FROM collection_items
    `;

    results.push(`Fetching prices for ${allCards.length} unique cards`);

    // Build price cache
    const priceCache = new Map<string, number>();

    for (const card of allCards) {
      const key = `${card.card_id}:${card.game}`;
      if (priceCache.has(key)) continue;

      let price = 0;
      if (card.game === 'pokemon') {
        price = await fetchPokemonPrice(card.card_id);
        await sleep(120); // Respect pokemontcg.io rate limits
      } else if (card.game === 'mtg') {
        price = await fetchMagicPrice(card.card_id);
        await sleep(120); // Respect Scryfall rate limits
      }

      priceCache.set(key, price);

      // Update cards_cache with fresh pricing
      await sql`
        INSERT INTO cards_cache (card_id, game, card_data, pricing_data, cached_at, expires_at)
        VALUES (
          ${card.card_id},
          ${card.game},
          '{}',
          ${JSON.stringify({ eur: price, updatedAt: new Date().toISOString() })},
          NOW(),
          NOW() + INTERVAL '7 days'
        )
        ON CONFLICT (card_id, game)
        DO UPDATE SET
          pricing_data = ${JSON.stringify({ eur: price, updatedAt: new Date().toISOString() })},
          cached_at = NOW(),
          expires_at = NOW() + INTERVAL '7 days'
      `;
    }

    // Get all users with collections
    const users = await sql`
      SELECT DISTINCT user_id FROM collection_items
    `;

    results.push(`Taking snapshots for ${users.length} users`);

    // Calculate and snapshot collection value per user
    for (const user of users) {
      const items = await sql`
        SELECT card_id, game, quantity FROM collection_items
        WHERE user_id = ${user.user_id}
      `;

      let total = 0;
      for (const item of items) {
        const price = priceCache.get(`${item.card_id}:${item.game}`) || 0;
        total += price * (item.quantity || 1);
      }

      await sql`
        INSERT INTO collection_value_snapshots (user_id, total_value_eur, card_count, snapshot_date)
        VALUES (${user.user_id}, ${total.toFixed(2)}, ${items.length}, CURRENT_DATE)
        ON CONFLICT (user_id, snapshot_date)
        DO UPDATE SET
          total_value_eur = ${total.toFixed(2)},
          card_count = ${items.length}
      `;

      results.push(`User ${user.user_id}: €${total.toFixed(2)} across ${items.length} items`);
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Price update error:', error);
    return NextResponse.json({ error: error.message, results }, { status: 500 });
  }
}
