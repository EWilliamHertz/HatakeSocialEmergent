import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
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

    // Get user_id from email
    const userResult = await sql`
      SELECT user_id FROM users WHERE email = ${user.email}
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult[0].user_id;

    // Get all bookmarked collections
    const bookmarks = await sql`
      SELECT 
        cb.bookmarked_user_id,
        u.username,
        u.profile_picture_url,
        COUNT(ci.id) as card_count,
        COALESCE(SUM(
          CASE 
            WHEN ci.game = 'pokemon' THEN
              CASE 
                WHEN ci.card_data::jsonb -> 'pricing' -> 'cardmarket' ? 'avg' THEN
                  (ci.card_data::jsonb -> 'pricing' -> 'cardmarket' ->> 'avg')::numeric
                WHEN ci.card_data::jsonb -> 'pricing' -> 'cardmarket' ? 'trend' THEN
                  (ci.card_data::jsonb -> 'pricing' -> 'cardmarket' ->> 'trend')::numeric
                ELSE 0
              END
            WHEN ci.game = 'mtg' THEN
              CASE 
                WHEN ci.card_data::jsonb -> 'prices' ? 'eur' THEN
                  (ci.card_data::jsonb -> 'prices' ->> 'eur')::numeric
                WHEN ci.card_data::jsonb -> 'prices' ? 'usd' THEN
                  (ci.card_data::jsonb -> 'prices' ->> 'usd')::numeric * 0.92
                ELSE 0
              END
            ELSE 0
          END * ci.quantity
        ), 0) as total_value
      FROM collection_bookmarks cb
      JOIN users u ON cb.bookmarked_user_id = u.user_id
      LEFT JOIN collection_items ci ON u.user_id = ci.user_id AND ci.quantity > 0
      WHERE cb.user_id = ${userId}
      GROUP BY cb.bookmarked_user_id, u.username, u.profile_picture_url
      ORDER BY u.username ASC
    `;

    const collections = bookmarks.map((bookmark: any) => ({
      user_id: bookmark.bookmarked_user_id,
      username: bookmark.username,
      profile_picture_url: bookmark.profile_picture_url,
      card_count: parseInt(bookmark.card_count || '0'),
      total_value: parseFloat(bookmark.total_value || '0')
    }));

    return NextResponse.json({ 
      success: true,
      collections 
    });
  } catch (error: any) {
    console.error('Get bookmarks list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
