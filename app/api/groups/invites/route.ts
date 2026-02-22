import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

// GET - Get user's pending group invites
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Ensure table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS group_invites (
          invite_id VARCHAR(255) PRIMARY KEY,
          group_id VARCHAR(255) NOT NULL,
          inviter_id VARCHAR(255) NOT NULL,
          invitee_id VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
    } catch (e) {}

    // Get pending invites for this user
    const invites = await sql`
      SELECT 
        gi.invite_id,
        gi.created_at,
        g.group_id,
        g.name as group_name,
        g.description as group_description,
        g.image as group_image,
        g.privacy,
        u.name as inviter_name,
        u.picture as inviter_picture
      FROM group_invites gi
      JOIN groups g ON gi.group_id = g.group_id
      JOIN users u ON gi.inviter_id = u.user_id
      WHERE gi.invitee_id = ${user.user_id} AND gi.status = 'pending'
      ORDER BY gi.created_at DESC
    `;

    return NextResponse.json({ success: true, invites });
  } catch (error: any) {
    console.error('Get invites error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Accept or decline an invite
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { inviteId, action, invite_id, accept } = body; 
    
    // Support both formats: {inviteId, action} and {invite_id, accept}
    const actualInviteId = inviteId || invite_id;
    const actualAction = action || (accept ? 'accept' : 'decline');

    if (!actualInviteId || !actualAction) {
      return NextResponse.json({ error: 'Invite ID and action required' }, { status: 400 });
    }

    if (!['accept', 'decline'].includes(actualAction)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the invite
    const invite = await sql`
      SELECT * FROM group_invites 
      WHERE invite_id = ${actualInviteId} AND invitee_id = ${user.user_id} AND status = 'pending'
    `;

    if (invite.length === 0) {
      return NextResponse.json({ error: 'Invite not found or already processed' }, { status: 404 });
    }

    if (actualAction === 'accept') {
      // Add user to group
      await sql`
        INSERT INTO group_members (group_id, user_id, role)
        VALUES (${invite[0].group_id}, ${user.user_id}, 'member')
        ON CONFLICT (group_id, user_id) DO NOTHING
      `;
    }

    // Update invite status
    await sql`
      UPDATE group_invites 
      SET status = ${actualAction === 'accept' ? 'accepted' : 'declined'}
      WHERE invite_id = ${actualInviteId}
    `;

    return NextResponse.json({ success: true, action: actualAction });
  } catch (error: any) {
    console.error('Process invite error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Accept or decline an invite (alternative method)
export async function PUT(request: NextRequest) {
  return POST(request);
}
