import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
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

    const { cardId, game } = await request.json();

    if (!cardId || !game) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if already favorited
    const existing = await sql`
      SELECT id FROM favorites
      WHERE user_id = ${user.user_id} AND card_id = ${cardId} AND game = ${game}
    `;

    if (existing.length > 0) {
      // Remove favorite
      await sql`
        DELETE FROM favorites
        WHERE user_id = ${user.user_id} AND card_id = ${cardId} AND game = ${game}
      `;
      return NextResponse.json({ success: true, favorited: false });
    } else {
      // Add favorite
      await sql`
        INSERT INTO favorites (user_id, card_id, game)
        VALUES (${user.user_id}, ${cardId}, ${game})
      `;
      return NextResponse.json({ success: true, favorited: true });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}