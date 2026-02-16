import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

// Ensure comment_reactions table exists
async function ensureTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS comment_reactions (
        id SERIAL PRIMARY KEY,
        comment_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(comment_id, user_id, emoji)
      )
    `;
  } catch (e) {
    // Table might already exist
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
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

    const { emoji } = await request.json();
    const { commentId } = await params;

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    await ensureTable();

    // Toggle reaction - if exists, remove it; otherwise add it
    const existing = await sql`
      SELECT id FROM comment_reactions 
      WHERE comment_id = ${commentId} AND user_id = ${user.user_id} AND emoji = ${emoji}
    `;

    if (existing.length > 0) {
      await sql`
        DELETE FROM comment_reactions 
        WHERE comment_id = ${commentId} AND user_id = ${user.user_id} AND emoji = ${emoji}
      `;
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      await sql`
        INSERT INTO comment_reactions (comment_id, user_id, emoji)
        VALUES (${commentId}, ${user.user_id}, ${emoji})
      `;
      return NextResponse.json({ success: true, action: 'added' });
    }
  } catch (error) {
    console.error('Toggle comment reaction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
