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

    const { targetUserId, action } = await request.json();
    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });
    }

    // Prevent self-bookmarking
    if (user.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot bookmark your own collection' }, { status: 400 });
    }

    if (action === 'bookmark') {
      // Insert bookmark
      await sql`
        INSERT INTO collection_bookmarks (user_id, bookmarked_user_id, created_at)
        VALUES (${user.id}, ${targetUserId}, NOW())
        ON CONFLICT DO NOTHING
      `;
      return NextResponse.json({ success: true, bookmarked: true });
    } else if (action === 'unbookmark') {
      // Delete bookmark
      await sql`
        DELETE FROM collection_bookmarks
        WHERE user_id = ${user.id} AND bookmarked_user_id = ${targetUserId}
      `;
      return NextResponse.json({ success: true, bookmarked: false });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Bookmarks error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
