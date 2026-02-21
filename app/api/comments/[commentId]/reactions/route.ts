import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// Add or remove emoji reaction on a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { emoji } = await request.json();
    const { commentId } = await params;

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    // Ensure table exists
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

    // Check if reaction exists
    const existing = await sql`
      SELECT id FROM comment_reactions 
      WHERE comment_id = ${commentId} AND user_id = ${user.user_id} AND emoji = ${emoji}
    `;

    if (existing.length > 0) {
      // Remove reaction
      await sql`
        DELETE FROM comment_reactions 
        WHERE comment_id = ${commentId} AND user_id = ${user.user_id} AND emoji = ${emoji}
      `;
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      // Add reaction
      await sql`
        INSERT INTO comment_reactions (comment_id, user_id, emoji)
        VALUES (${commentId}, ${user.user_id}, ${emoji})
      `;
      
      // Get comment owner to send notification
      const comments = await sql`
        SELECT user_id, post_id FROM comments WHERE comment_id = ${commentId}
      `;
      
      if (comments.length > 0 && comments[0].user_id !== user.user_id) {
        try {
          await createNotification({
            userId: comments[0].user_id,
            type: 'like',
            title: 'New Reaction',
            message: `${user.name} reacted ${emoji} to your comment`,
            link: `/feed#${comments[0].post_id}`,
          });
        } catch (e) {
          console.error('Failed to send comment reaction notification:', e);
        }
      }
      
      return NextResponse.json({ success: true, action: 'added' });
    }
  } catch (error) {
    console.error('Comment reaction error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get reactions for a comment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const user = await getUserFromRequest(request);
    const currentUserId = user?.user_id || '';

    const reactions = await sql`
      SELECT emoji, COUNT(*) as count,
        BOOL_OR(user_id = ${currentUserId}) as user_reacted
      FROM comment_reactions
      WHERE comment_id = ${commentId}
      GROUP BY emoji
    `;

    return NextResponse.json({
      success: true,
      reactions: reactions.map((r: any) => ({
        emoji: r.emoji,
        count: Number(r.count),
        userReacted: r.user_reacted,
      })),
    });
  } catch (error) {
    console.error('Get comment reactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
