import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    // Fetch users who liked the post
    const likes = await sql`
      SELECT u.user_id, u.name, u.picture
      FROM likes l
      JOIN users u ON l.user_id = u.user_id
      WHERE l.post_id = ${postId}
      ORDER BY l.created_at DESC
    `;

    // Fetch users who reacted to the post
    const reactions = await sql`
      SELECT pr.emoji, u.user_id, u.name, u.picture
      FROM post_reactions pr
      JOIN users u ON pr.user_id = u.user_id
      WHERE pr.post_id = ${postId}
      ORDER BY pr.created_at DESC
    `;

    return NextResponse.json({ success: true, likes, reactions });
  } catch (error) {
    console.error('Get reactors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}