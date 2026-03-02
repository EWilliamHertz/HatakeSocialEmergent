import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { userId } = await params;
    const gameFilter = request.nextUrl.searchParams.get('game');

    // Get user info
    const userResult = await sql`
      SELECT id, username, profile_picture_url
      FROM users
      WHERE id = ${userId}
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build query based on game filter
    let itemsQuery;
    if (gameFilter && gameFilter.trim()) {
      itemsQuery = sql`
        SELECT 
          c.id,
          c.card_id,
          c.game,
          c.quantity,
          c.condition,
          c.foil as is_foil,
          c.card_data
        FROM collection_items c
        WHERE c.user_id = ${userId}
        AND c.game = ${gameFilter}
        AND c.quantity > 0
        ORDER BY c.added_at DESC
      `;
    } else {
      itemsQuery = sql`
        SELECT 
          c.id,
          c.card_id,
          c.game,
          c.quantity,
          c.condition,
          c.foil as is_foil,
          c.card_data
        FROM collection_items c
        WHERE c.user_id = ${userId}
        AND c.quantity > 0
        ORDER BY c.added_at DESC
      `;
    }

    const items = await itemsQuery;

    // Transform to match expected format
    const transformedItems = items.map((item: any) => {
      const cardData = typeof item.card_data === 'string' 
        ? JSON.parse(item.card_data) 
        : item.card_data;
      
      return {
        id: item.id,
        card_id: item.card_id,
        game: item.game,
        quantity: item.quantity,
        condition: item.condition,
        is_foil: item.is_foil,
        card_data: cardData
      };
    });

    return NextResponse.json({ 
      success: true, 
      items: transformedItems,
      user: userResult[0]
    });
  } catch (error: any) {
    console.error('Get user collection error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
