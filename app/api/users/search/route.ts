import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
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
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
      return NextResponse.json({ success: true, users: [] });
    }

    // Search users by name or email, excluding the current user
    const users = await sql`
      SELECT user_id, name, email, picture
      FROM users
      WHERE user_id != ${user.user_id}
        AND (
          LOWER(name) LIKE ${`%${query.toLowerCase()}%`}
          OR LOWER(email) LIKE ${`%${query.toLowerCase()}%`}
        )
      LIMIT 20
    `;

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
