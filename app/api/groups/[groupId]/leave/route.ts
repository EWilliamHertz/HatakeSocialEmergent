import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

// POST - Leave a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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
