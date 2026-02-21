import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // Support both cookie and Bearer token auth
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { postId } = await params;

    // Check if already liked
    const existing = await sql`
      SELECT id FROM likes
      WHERE post_id = ${postId} AND user_id = ${user.user_id}
    `;

    if (existing.length > 0) {
      // Unlike
      await sql`
        DELETE FROM likes
        WHERE post_id = ${postId} AND user_id = ${user.user_id}
      `;
      return NextResponse.json({ success: true, liked: false });
    } else {
      // Like
      await sql`
        INSERT INTO likes (post_id, user_id)
        VALUES (${postId}, ${user.user_id})
      `;
      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error) {
    console.error('Toggle like error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}