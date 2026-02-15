import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { ids, price, condition } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Item IDs are required' },
        { status: 400 }
      );
    }

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      );
    }

    // Get the collection items
    const items = await sql`
      SELECT id, card_id, game, card_data, quantity, condition as item_condition, foil
      FROM collection_items
      WHERE id = ANY(${ids}) AND user_id = ${user.user_id}
    `;

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No valid items found' },
        { status: 400 }
      );
    }

    // Create listings for each item
    let listed = 0;
    for (const item of items) {
      const listingId = generateId('list');
      await sql`
        INSERT INTO marketplace_listings (
          listing_id, user_id, card_id, game, card_data, price, currency, 
          condition, foil, quantity, status
        )
        VALUES (
          ${listingId},
          ${user.user_id},
          ${item.card_id},
          ${item.game},
          ${JSON.stringify(item.card_data)},
          ${price},
          'USD',
          ${condition || item.item_condition || 'Near Mint'},
          ${item.foil || false},
          ${item.quantity || 1},
          'active'
        )
      `;
      listed++;
    }

    return NextResponse.json({ success: true, listed });
  } catch (error) {
    console.error('Bulk list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
