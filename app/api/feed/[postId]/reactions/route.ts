import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { sendReactionEmail } from '@/lib/email';

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
    // Support both cookie and Bearer token auth
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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
      
      // Get post owner to send notification
      const posts = await sql`
        SELECT user_id FROM posts WHERE post_id = ${postId}
      `;
      
      if (posts.length > 0 && posts[0].user_id !== user.user_id) {
        try {
          await createNotification({
            userId: posts[0].user_id,
            type: 'like', // Use 'like' type for reactions too
            title: 'New Reaction',
            message: `${user.name} reacted ${emoji} to your post`,
            link: `/feed#${postId}`,
          });
        } catch (e) {
          console.error('Failed to send reaction notification:', e);
        }
      }
      
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
    
    // Support both cookie and Bearer token auth
    const user = await getUserFromRequest(request);
    const currentUserId = user?.user_id || '';

    await ensureTable();

    const reactions = await sql`
      SELECT emoji, COUNT(*) as count,
        BOOL_OR(user_id = ${currentUserId}) as user_reacted
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
