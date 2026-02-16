import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

// Ensure post_reactions table exists
async function ensureTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS post_reactions (
        id SERIAL PRIMARY KEY,
        post_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id, emoji)
      )
    `;
  } catch (e) {
    // Table might already exist
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
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
    const { postId } = await params;

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    await ensureTable();

    // Toggle reaction - if exists, remove it; otherwise add it
    const existing = await sql`
      SELECT id FROM post_reactions 
      WHERE post_id = ${postId} AND user_id = ${user.user_id} AND emoji = ${emoji}
    `;

    if (existing.length > 0) {
      await sql`
        DELETE FROM post_reactions 
        WHERE post_id = ${postId} AND user_id = ${user.user_id} AND emoji = ${emoji}
      `;
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      await sql`
        INSERT INTO post_reactions (post_id, user_id, emoji)
        VALUES (${postId}, ${user.user_id}, ${emoji})
      `;
      return NextResponse.json({ success: true, action: 'added' });
    }
  } catch (error) {
    console.error('Toggle post reaction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const sessionToken = request.cookies.get('session_token')?.value;
    let currentUserId = null;
    
    if (sessionToken) {
      const user = await getSessionUser(sessionToken);
      if (user) currentUserId = user.user_id;
    }

    await ensureTable();

    const reactions = await sql`
      SELECT emoji, COUNT(*) as count,
        BOOL_OR(user_id = ${currentUserId || ''}) as user_reacted
      FROM post_reactions
      WHERE post_id = ${postId}
      GROUP BY emoji
    `;

    return NextResponse.json({ 
      success: true, 
      reactions: reactions.map(r => ({ 
        emoji: r.emoji, 
        count: Number(r.count), 
        userReacted: r.user_reacted 
      }))
    });
  } catch (error) {
    console.error('Get post reactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
