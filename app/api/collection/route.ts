import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = sql`
      SELECT id, card_id, game, card_data, quantity, condition, foil, notes, added_at
      FROM collection_items
      WHERE user_id = ${user.user_id}
    `;

    if (game) {
      query = sql`
        SELECT id, card_id, game, card_data, quantity, condition, foil, notes, added_at
        FROM collection_items
        WHERE user_id = ${user.user_id} AND game = ${game}
      `;
    }

    const items = await query;

    return NextResponse.json({
      success: true,
      items: items.slice(offset, offset + limit),
      total: items.length,
    });
  } catch (error) {
    console.error('Get collection error:', error);
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

    const { cardId, game, cardData, quantity, condition, foil, notes } =
      await request.json();

    if (!cardId || !game || !cardData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO collection_items (
        user_id, card_id, game, card_data, quantity, condition, foil, notes
      )
      VALUES (
        ${user.user_id},
        ${cardId},
        ${game},
        ${JSON.stringify(cardData)},
        ${quantity || 1},
        ${condition || 'near_mint'},
        ${foil || false},
        ${notes || ''}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add to collection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('id');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM collection_items
      WHERE id = ${parseInt(itemId)} AND user_id = ${user.user_id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete from collection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}