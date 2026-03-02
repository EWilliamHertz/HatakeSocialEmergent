import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game') || '';

    // Fetch user info (public data only)
    const userResult = await sql`
      SELECT user_id, name, picture
      FROM users
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const user = userResult[0];

    // Fetch collection items
    const items = game
      ? await sql`
          SELECT id, card_id, game, card_data, quantity, condition, is_foil
          FROM collection_items
          WHERE user_id = ${userId} AND game = ${game}
          ORDER BY created_at DESC
        `
      : await sql`
          SELECT id, card_id, game, card_data, quantity, condition, is_foil
          FROM collection_items
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `;

    return NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        name: user.name,
        picture: user.picture,
      },
      items,
    });
  } catch (error) {
    console.error('Public collection API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
