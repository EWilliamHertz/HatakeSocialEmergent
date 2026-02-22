import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

// Admin endpoint to award badges manually
export async function POST(request: NextRequest) {
  try {
    // Support both auth methods
    let user = await getUserFromRequest(request);
    if (!user) {
      const sessionToken = request.cookies.get('session_token')?.value;
      if (sessionToken) {
        user = await getSessionUser(sessionToken);
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if admin
    if (!(user as any).is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, badgeType, action } = await request.json();

    if (!userId || !badgeType) {
      return NextResponse.json({ error: 'userId and badgeType required' }, { status: 400 });
    }

    if (action === 'remove') {
      // Remove badge
      await sql`
        DELETE FROM user_badges 
        WHERE user_id = ${userId} AND badge_type = ${badgeType}
      `;
      return NextResponse.json({ success: true, message: 'Badge removed' });
    } else {
      // Check if already has badge
      const [existing] = await sql`
        SELECT 1 FROM user_badges 
        WHERE user_id = ${userId} AND badge_type = ${badgeType}
      `;

      if (existing) {
        return NextResponse.json({ error: 'User already has this badge' }, { status: 400 });
      }

      // Award badge
      await sql`
        INSERT INTO user_badges (user_id, badge_type, awarded_at, awarded_by)
        VALUES (${userId}, ${badgeType}, NOW(), ${user.user_id})
      `;

      return NextResponse.json({ success: true, message: 'Badge awarded' });
    }
  } catch (error) {
    console.error('Admin badge error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get all users for badge management
export async function GET(request: NextRequest) {
  try {
    // Support both auth methods
    let user = await getUserFromRequest(request);
    if (!user) {
      const sessionToken = request.cookies.get('session_token')?.value;
      if (sessionToken) {
        user = await getSessionUser(sessionToken);
      }
    }
    
    if (!user || !(user as any).is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const users = await sql`
      SELECT 
        u.user_id, 
        u.name, 
        u.email, 
        u.picture,
        u.created_at,
        COALESCE(
          (SELECT json_agg(json_build_object('badge_type', badge_type, 'awarded_at', awarded_at))
           FROM user_badges WHERE user_id = u.user_id),
          '[]'
        ) as badges
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Get users for badges error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
