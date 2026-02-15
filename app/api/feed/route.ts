import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'public';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let posts;

    if (tab === 'friends') {
      // Get posts from friends only
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
      // Get posts from user's groups
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

    return NextResponse.json({ success: true, posts });
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
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { content, image, cardId, game, groupId, visibility } =
      await request.json();

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