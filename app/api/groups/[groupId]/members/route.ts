import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

// GET - Get group members
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

    // Check if user is a member (for private groups)
    const groups = await sql`
      SELECT privacy FROM groups WHERE group_id = ${groupId}
    `;

    if (groups.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (groups[0].privacy === 'private' && membership.length === 0) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get members
    const members = await sql`
      SELECT 
        u.user_id,
        u.name,
        u.picture,
        u.bio,
        gm.role,
        gm.joined_at
      FROM group_members gm
      JOIN users u ON gm.user_id = u.user_id
      WHERE gm.group_id = ${groupId}
      ORDER BY 
        CASE gm.role WHEN 'admin' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END,
        gm.joined_at ASC
    `;

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('Get group members error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update member role (admin only)
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
    const adminCheck = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
    }

    if (!['admin', 'moderator', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Update member role
    await sql`
      UPDATE group_members 
      SET role = ${role}
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update member role error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove member (admin only)
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
    const adminCheck = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Cannot remove yourself as admin
    if (userId === user.user_id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    // Remove member
    await sql`
      DELETE FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
