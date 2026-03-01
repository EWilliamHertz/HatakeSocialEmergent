import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

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
  } catch { return []; }
}

// Safe badge query wrapper – returns 0 if user_badges table doesn't exist
async function getBadgeData(userId: string): Promise<{ count: number; topBadge: string | null }> {
  try {
    const rows = await sql`
      SELECT badge_type FROM user_badges WHERE user_id = ${userId} ORDER BY awarded_at ASC
    `;
    return { count: rows.length, topBadge: rows[0]?.badge_type ?? null };
  } catch { return { count: 0, topBadge: null }; }
}

const BASE_POST_QUERY = (userId: string) => sql`
  SELECT p.*, u.name, u.picture,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) as like_count,
    (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) as comment_count,
    EXISTS(SELECT 1 FROM likes WHERE post_id = p.post_id AND user_id = ${userId}) as liked
  FROM posts p
  JOIN users u ON p.user_id = u.user_id
  WHERE p.visibility = 'public'
  ORDER BY p.created_at DESC
  LIMIT 20
`;

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || searchParams.get('type') || 'public';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let posts: any[] = [];

    if (tab === 'friends') {
      posts = await sql`
        SELECT p.*, u.name, u.picture,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) as like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) as comment_count,
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.post_id AND user_id = ${user.user_id}) as liked
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        JOIN friendships f ON (f.user_id = ${user.user_id} AND f.friend_id = p.user_id AND f.status = 'accepted')
          OR (f.friend_id = ${user.user_id} AND f.user_id = p.user_id AND f.status = 'accepted')
        WHERE p.visibility IN ('public', 'friends')
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (tab === 'groups') {
      const groupId = searchParams.get('group_id');
      if (groupId) {
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
      const filterUserId = searchParams.get('userId');
      if (filterUserId) {
        // Profile page: show a specific user's public posts
        posts = await sql`
          SELECT p.*, u.name, u.picture,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) as like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) as comment_count,
            EXISTS(SELECT 1 FROM likes WHERE post_id = p.post_id AND user_id = ${user.user_id}) as liked
          FROM posts p
          JOIN users u ON p.user_id = u.user_id
          WHERE p.user_id = ${filterUserId}
            AND p.visibility = 'public'
          ORDER BY p.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
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
    }

    // Enrich each post with badges + reactions
    const postsWithData = await Promise.all(
      posts.map(async (post: any) => {
        const [badges, reactions] = await Promise.all([
          getBadgeData(post.user_id),
          getPostReactions(post.post_id, user.user_id),
        ]);
        return {
          ...post,
          badge_count: badges.count,
          top_badge: badges.topBadge,
          reactions,
        };
      })
    );

    return NextResponse.json({ success: true, posts: postsWithData });
  } catch (error) {
    console.error('Get feed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { content, image, cardId, game, visibility } = body;
    const groupId = body.groupId || body.group_id;

    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    const postId = generateId('post');
    await sql`
      INSERT INTO posts (post_id, user_id, content, image, card_id, game, group_id, visibility)
      VALUES (${postId}, ${user.user_id}, ${content}, ${image || null}, ${cardId || null}, ${game || null}, ${groupId || null}, ${visibility || 'public'})
    `;
    return NextResponse.json({ success: true, postId });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
