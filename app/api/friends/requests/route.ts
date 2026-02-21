import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get pending friend requests sent to this user
    const requests = await sql`
      SELECT u.user_id, u.name, u.picture, f.created_at
      FROM friendships f
      JOIN users u ON f.user_id = u.user_id
      WHERE f.friend_id = ${user.user_id}
        AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `;

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('Get friend requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
