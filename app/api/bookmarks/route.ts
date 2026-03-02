import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

export async function POST(
  request: NextRequest
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

    const { userId } = await request.json();

    // Prevent self-bookmarking
    if (user.user_id === userId) {
      return NextResponse.json({ error: 'Cannot bookmark own collection' }, { status: 400 });
    }

    // Check if already bookmarked
    const existing = await sql`
      SELECT id FROM collection_bookmarks
      WHERE user_id = ${user.user_id} AND bookmarked_user_id = ${userId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Unbookmark
      await sql`
        DELETE FROM collection_bookmarks
        WHERE user_id = ${user.user_id} AND bookmarked_user_id = ${userId}
      `;
      return NextResponse.json({ success: true, bookmarked: false });
    } else {
      // Bookmark
      await sql`
        INSERT INTO collection_bookmarks (user_id, bookmarked_user_id)
        VALUES (${user.user_id}, ${userId})
      `;
      return NextResponse.json({ success: true, bookmarked: true });
    }
  } catch (error) {
    console.error('Bookmark error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}