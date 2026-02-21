import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    let users;
    
    if (!query.trim()) {
      // Return all users (excluding current user) for browsing
      users = await sql`
        SELECT user_id, name, email, picture
        FROM users
        WHERE user_id != ${user.user_id}
        ORDER BY name ASC
        LIMIT 50
      `;
    } else {
      // Search users by name or email, excluding the current user
      users = await sql`
        SELECT user_id, name, email, picture
        FROM users
        WHERE user_id != ${user.user_id}
          AND (
            LOWER(name) LIKE ${`%${query.toLowerCase()}%`}
            OR LOWER(email) LIKE ${`%${query.toLowerCase()}%`}
          )
        LIMIT 20
      `;
    }

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
