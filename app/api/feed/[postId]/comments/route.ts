import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

// Ensure comment_reactions table exists
async function ensureReactionsTable() {
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
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { content, parentCommentId } = await request.json();
    const { postId } = await params;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const commentId = generateId('comment');

    // Ensure parent_comment_id column exists
    try {
      await sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id VARCHAR(255)`;
    } catch (e) {
      // Column might already exist
    }

    await sql`
      INSERT INTO comments (comment_id, post_id, user_id, content, parent_comment_id)
      VALUES (${commentId}, ${postId}, ${user.user_id}, ${content}, ${parentCommentId || null})
    `;

    return NextResponse.json({ 
      success: true, 
      commentId,
      comment: {
        comment_id: commentId,
        post_id: postId,
        user_id: user.user_id,
        name: user.name,
        picture: user.picture,
        content,
        parent_comment_id: parentCommentId || null,
        created_at: new Date().toISOString(),
        reactions: [],
      }
    });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const user = await getUserFromRequest(request);
    const currentUserId = user?.user_id || null;

    await ensureReactionsTable();

    // Ensure parent_comment_id column exists
    try {
      await sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id VARCHAR(255)`;
    } catch (e) {
      // Column might already exist
    }

    const comments = await sql`
      SELECT c.*, u.name, u.picture,
        COALESCE(c.parent_comment_id, '') as parent_comment_id
      FROM comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.post_id = ${postId}
      ORDER BY c.created_at ASC
    `;

    // Get reactions for all comments
    const commentIds = comments.map((c: any) => c.comment_id);
    let reactions: any[] = [];
    
    if (commentIds.length > 0) {
      reactions = await sql`
        SELECT comment_id, emoji, COUNT(*) as count,
          BOOL_OR(user_id = ${currentUserId || ''}) as user_reacted
        FROM comment_reactions
        WHERE comment_id = ANY(${commentIds})
        GROUP BY comment_id, emoji
      `;
    }

    // Attach reactions to comments
    const commentsWithReactions = comments.map((comment: any) => ({
      ...comment,
      reactions: reactions
        .filter(r => r.comment_id === comment.comment_id)
        .map(r => ({ emoji: r.emoji, count: Number(r.count), userReacted: r.user_reacted }))
    }));

    return NextResponse.json({ success: true, comments: commentsWithReactions });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}