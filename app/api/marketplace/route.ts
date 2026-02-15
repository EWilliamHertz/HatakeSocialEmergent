import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = sql`
      SELECT l.*, u.name, u.picture
      FROM marketplace_listings l
      JOIN users u ON l.user_id = u.user_id
      WHERE l.status = 'active'
      ORDER BY l.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    if (game) {
      query = sql`
        SELECT l.*, u.name, u.picture
        FROM marketplace_listings l
        JOIN users u ON l.user_id = u.user_id
        WHERE l.status = 'active' AND l.game = ${game}
        ORDER BY l.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const listings = await query;

    return NextResponse.json({ success: true, listings });
  } catch (error) {
    console.error('Get marketplace error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const {
      cardId,
      game,
      cardData,
      price,
      currency,
      condition,
      foil,
      quantity,
      description,
    } = await request.json();

    if (!cardId || !game || !cardData || !price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const listingId = generateId('listing');

    await sql`
      INSERT INTO marketplace_listings (
        listing_id, user_id, card_id, game, card_data, price, currency,
        condition, foil, quantity, description, status
      )
      VALUES (
        ${listingId},
        ${user.user_id},
        ${cardId},
        ${game},
        ${JSON.stringify(cardData)},
        ${price},
        ${currency || 'USD'},
        ${condition || 'near_mint'},
        ${foil || false},
        ${quantity || 1},
        ${description || ''},
        'active'
      )
    `;

    return NextResponse.json({ success: true, listingId });
  } catch (error) {
    console.error('Create listing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}