import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

// GET - Get group details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { groupId } = await params;

    // Get group details
    const groups = await sql`
      SELECT 
        g.*,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.group_id) as member_count
      FROM groups g
      WHERE g.group_id = ${groupId}
    `;

    if (groups.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const group = groups[0];

    // Check if user is a member
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    const isMember = membership.length > 0;
    const role = isMember ? membership[0].role : null;

    // If private group and not a member, don't show details
    if (group.privacy === 'private' && !isMember) {
      return NextResponse.json({
        success: true,
        group: {
          group_id: group.group_id,
          name: group.name,
          description: group.description,
          image: group.image,
          privacy: group.privacy,
          member_count: group.member_count,
        },
        isMember: false,
        role: null,
        members: [],
        posts: [],
      });
    }

    // Get members
    const members = await sql`
      SELECT 
        u.user_id,
        u.name,
        u.picture,
        gm.role,
        gm.joined_at
      FROM group_members gm
      JOIN users u ON gm.user_id = u.user_id
      WHERE gm.group_id = ${groupId}
      ORDER BY 
        CASE gm.role WHEN 'admin' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END,
        gm.joined_at ASC
    `;

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

    return NextResponse.json({
      success: true,
      group: {
        ...group,
        member_count: Number(group.member_count),
      },
      isMember,
      role,
      members,
      posts,
    });
  } catch (error) {
    console.error('Get group error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete group (admin only)
export async function DELETE(
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

    // Check if user is admin
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (membership.length === 0 || membership[0].role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete group (cascade will delete members, posts, etc.)
    await sql`DELETE FROM groups WHERE group_id = ${groupId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete group error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update group settings (admin only)
export async function PATCH(
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

    // Check if user is admin
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (membership.length === 0 || membership[0].role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { name, description, privacy, image } = await request.json();

    await sql`
      UPDATE groups 
      SET 
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        privacy = COALESCE(${privacy}, privacy),
        image = COALESCE(${image}, image),
        updated_at = CURRENT_TIMESTAMP
      WHERE group_id = ${groupId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update group error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
