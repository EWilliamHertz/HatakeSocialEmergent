import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

// Helper to get reactions for a post
async function getPostReactions(postId: string, userId: string) {
  try {
    const reactions = await sql`
      SELECT emoji, COUNT(*) as count,
        BOOL_OR(user_id = ${userId}) as user_reacted
      FROM post_reactions
      WHERE post_id = ${postId}
      GROUP BY emoji
    `;
    return reactions.map((r: any) => ({
      emoji: r.emoji,
      count: Number(r.count),
      userReacted: r.user_reacted
    }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || searchParams.get('type') || 'public';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let posts;

    if (tab === 'friends') {
      // Get posts from friends only
      posts = await sql`
        SELECT p.*, u.name, u.picture,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) as like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) as comment_count,
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.post_id AND user_id = ${user.user_id}) as liked,
          (SELECT COUNT(*) FROM user_badges WHERE user_id = p.user_id) as badge_count,
          (SELECT badge_type FROM user_badges WHERE user_id = p.user_id ORDER BY awarded_at ASC LIMIT 1) as top_badge
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        JOIN friendships f ON (f.user_id = ${user.user_id} AND f.friend_id = p.user_id AND f.status = 'accepted')
          OR (f.friend_id = ${user.user_id} AND f.user_id = p.user_id AND f.status = 'accepted')
        WHERE p.visibility IN ('public', 'friends')
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (tab === 'groups') {
      // Get posts from user's groups
      const groupId = searchParams.get('group_id');
      
      if (groupId) {
        // Get posts for a specific group
        posts = await sql`
          SELECT p.*, u.name, u.picture, g.name as group_name,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) as like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) as comment_count,
            EXISTS(SELECT 1 FROM likes WHERE post_id = p.post_id AND user_id = ${user.user_id}) as liked
          FROM posts p
          JOIN users u ON p.user_id = u.user_id
          JOIN groups g ON p.group_id = g.group_id
          JOIN group_members gm ON gm.group_id = g.group_id AND gm.user_id = ${user.user_id}
          WHERE p.group_id = ${groupId}
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        // Get posts from all user's groups
        posts = await sql`
          SELECT p.*, u.name, u.picture, g.name as group_name,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) as like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) as comment_count,
            EXISTS(SELECT 1 FROM likes WHERE post_id = p.post_id AND user_id = ${user.user_id}) as liked
          FROM posts p
          JOIN users u ON p.user_id = u.user_id
          JOIN groups g ON p.group_id = g.group_id
          JOIN group_members gm ON gm.group_id = g.group_id AND gm.user_id = ${user.user_id}
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      }
    } else {
      // Public feed
      posts = await sql`
        SELECT p.*, u.name, u.picture,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) as like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) as comment_count,
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.post_id AND user_id = ${user.user_id}) as liked
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        WHERE p.visibility = 'public'
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Add reactions to each post
    const postsWithReactions = await Promise.all(
      posts.map(async (post: any) => ({
        ...post,
        reactions: await getPostReactions(post.post_id, user.user_id)
      }))
    );

    return NextResponse.json({ success: true, posts: postsWithReactions });
  } catch (error) {
    console.error('Get feed error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { content, image, cardId, game, visibility } = body;
    // Accept both groupId and group_id for backwards compatibility
    const groupId = body.groupId || body.group_id;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const postId = generateId('post');

    await sql`
      INSERT INTO posts (
        post_id, user_id, content, image, card_id, game, group_id, visibility
      )
      VALUES (
        ${postId},
        ${user.user_id},
        ${content},
        ${image || null},
        ${cardId || null},
        ${game || null},
        ${groupId || null},
        ${visibility || 'public'}
      )
    `;

    return NextResponse.json({ success: true, postId });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}