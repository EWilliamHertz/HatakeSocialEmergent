import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

// GET - Get pending invites for a group (admin only)
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

    // Check if user is admin or moderator
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (membership.length === 0 || !['admin', 'moderator'].includes(membership[0].role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Ensure invites table exists
    await sql`
      CREATE TABLE IF NOT EXISTS group_invites (
        invite_id VARCHAR(255) PRIMARY KEY,
        group_id VARCHAR(255) NOT NULL,
        inviter_id VARCHAR(255) NOT NULL,
        invitee_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, invitee_id)
      )
    `;

    // Get pending invites
    const invites = await sql`
      SELECT 
        gi.invite_id,
        gi.status,
        gi.created_at,
        u.user_id,
        u.name,
        u.email,
        u.picture
      FROM group_invites gi
      JOIN users u ON gi.invitee_id = u.user_id
      WHERE gi.group_id = ${groupId} AND gi.status = 'pending'
      ORDER BY gi.created_at DESC
    `;

    return NextResponse.json({ success: true, invites });
  } catch (error: any) {
    console.error('Get group invites error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Invite a user to the group
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
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Check if inviter is a member (any member can invite to public groups)
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Check group privacy - only admin/moderator can invite to private groups
    const group = await sql`SELECT privacy FROM groups WHERE group_id = ${groupId}`;
    if (group.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group[0].privacy === 'private' && !['admin', 'moderator'].includes(membership[0].role)) {
      return NextResponse.json({ error: 'Only admins can invite to private groups' }, { status: 403 });
    }

    // Check if user is already a member
    const existingMember = await sql`
      SELECT user_id FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${userId}
    `;

    if (existingMember.length > 0) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
    }

    // Ensure invites table exists
    await sql`
      CREATE TABLE IF NOT EXISTS group_invites (
        invite_id VARCHAR(255) PRIMARY KEY,
        group_id VARCHAR(255) NOT NULL,
        inviter_id VARCHAR(255) NOT NULL,
        invitee_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, invitee_id)
      )
    `;

    // Check if already invited
    const existingInvite = await sql`
      SELECT invite_id FROM group_invites 
      WHERE group_id = ${groupId} AND invitee_id = ${userId} AND status = 'pending'
    `;

    if (existingInvite.length > 0) {
      return NextResponse.json({ error: 'User already has a pending invite' }, { status: 400 });
    }

    // Create invite
    const inviteId = generateId('invite');
    await sql`
      INSERT INTO group_invites (invite_id, group_id, inviter_id, invitee_id)
      VALUES (${inviteId}, ${groupId}, ${user.user_id}, ${userId})
    `;

    // Create notification for the invitee
    try {
      const notificationId = generateId('notif');
      await sql`
        INSERT INTO notifications (notification_id, user_id, type, content, related_id)
        VALUES (${notificationId}, ${userId}, 'group_invite', 'You have been invited to join a group', ${groupId})
      `;
    } catch (e) {
      // Notification table might not exist
    }

    return NextResponse.json({ success: true, inviteId });
  } catch (error: any) {
    console.error('Invite to group error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Cancel an invite
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
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('inviteId');

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID required' }, { status: 400 });
    }

    // Check if user is admin or moderator
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (membership.length === 0 || !['admin', 'moderator'].includes(membership[0].role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await sql`
      DELETE FROM group_invites 
      WHERE invite_id = ${inviteId} AND group_id = ${groupId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Cancel invite error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
