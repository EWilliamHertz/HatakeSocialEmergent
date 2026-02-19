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
      pricePercentage, // New: percentage of market value (e.g., 90 = 90% of market price)
      currency,
      condition,
      foil,
      quantity,
      description,
    } = await request.json();

    if (!cardId || !game || !cardData || (!price && !pricePercentage)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate actual price if percentage is provided
    let finalPrice = price;
    if (pricePercentage && cardData.prices) {
      // Get the market price from card data
      const marketPrice = cardData.prices?.usd || cardData.prices?.eur || cardData.price || 0;
      if (marketPrice > 0) {
        finalPrice = (marketPrice * pricePercentage / 100).toFixed(2);
      }
    }

    const listingId = generateId('listing');

    await sql`
      INSERT INTO marketplace_listings (
        listing_id, user_id, card_id, game, card_data, price, price_percentage, currency,
        condition, foil, quantity, description, status
      )
      VALUES (
        ${listingId},
        ${user.user_id},
        ${cardId},
        ${game},
        ${JSON.stringify(cardData)},
        ${finalPrice},
        ${pricePercentage || null},
        ${currency || 'USD'},
        ${condition || 'near_mint'},
        ${foil || false},
        ${quantity || 1},
        ${description || ''},
        'active'
      )
    `;

    return NextResponse.json({ success: true, listingId, calculatedPrice: finalPrice });
  } catch (error) {
    console.error('Create listing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}