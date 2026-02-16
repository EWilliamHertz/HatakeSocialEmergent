import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';
import { generateId } from '@/lib/utils';

// GET - Get group posts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
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

    const { groupId } = await params;

    // Check if user is a member
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    // Check group privacy
    const groups = await sql`
      SELECT privacy FROM groups WHERE group_id = ${groupId}
    `;

    if (groups.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (groups[0].privacy === 'private' && membership.length === 0) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get posts
    const posts = await sql`
      SELECT 
        p.*,
        u.name,
        u.picture,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.post_id) as like_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.post_id) as comment_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.post_id AND user_id = ${user.user_id}) as liked
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      WHERE p.group_id = ${groupId}
      ORDER BY p.created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    console.error('Get group posts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a post in the group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
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

    const { groupId } = await params;

    // Check if user is a member
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Must be a member to post' }, { status: 403 });
    }

    const { content, image, card_id, game } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const postId = generateId('post');

    await sql`
      INSERT INTO posts (post_id, user_id, group_id, content, image, card_id, game, visibility)
      VALUES (${postId}, ${user.user_id}, ${groupId}, ${content.trim()}, ${image || null}, ${card_id || null}, ${game || null}, 'group')
    `;

    return NextResponse.json({ success: true, postId });
  } catch (error) {
    console.error('Create group post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
