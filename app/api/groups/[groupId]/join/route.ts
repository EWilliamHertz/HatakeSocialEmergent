import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

// POST - Join a group
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

    // Check if group exists
    const groups = await sql`
      SELECT group_id, privacy FROM groups WHERE group_id = ${groupId}
    `;

    if (groups.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const group = groups[0];

    // Check if already a member
    const existing = await sql`
      SELECT id FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 });
    }

    // For private groups, you would implement a request system
    // For now, only allow joining public groups directly
    if (group.privacy === 'private') {
      return NextResponse.json({ error: 'This is a private group. Request to join.' }, { status: 403 });
    }

    // Add user as member
    await sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${groupId}, ${user.user_id}, 'member')
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Join group error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Leave a group
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

    // Check if user is a member
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 400 });
    }

    // If user is admin, check if they're the only admin
    if (membership[0].role === 'admin') {
      const adminCount = await sql`
        SELECT COUNT(*) as count FROM group_members 
        WHERE group_id = ${groupId} AND role = 'admin'
      `;
      
      if (Number(adminCount[0].count) === 1) {
        return NextResponse.json({ 
          error: 'You are the only admin. Transfer ownership before leaving or delete the group.' 
        }, { status: 400 });
      }
    }

    // Remove from group
    await sql`
      DELETE FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave group error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
