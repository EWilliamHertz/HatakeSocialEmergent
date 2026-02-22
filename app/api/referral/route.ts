import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

// GET - Get user's invite code and referral stats
export async function GET(request: NextRequest) {
  try {
    let user = await getUserFromRequest(request);
    if (!user) {
      const sessionToken = request.cookies.get('session_token')?.value;
      if (sessionToken) user = await getSessionUser(sessionToken);
    }
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [userData] = await sql`
      SELECT invite_code, referral_count FROM users WHERE user_id = ${user.user_id}
    `;

    // Get list of referred users
    const referrals = await sql`
      SELECT user_id, name, picture, created_at 
      FROM users 
      WHERE referred_by = ${user.user_id}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({
      success: true,
      inviteCode: userData?.invite_code || null,
      referralCount: parseInt(userData?.referral_count || '0'),
      referrals,
    });
  } catch (error) {
    console.error('Get referral error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Set or update invite code
export async function POST(request: NextRequest) {
  try {
    let user = await getUserFromRequest(request);
    if (!user) {
      const sessionToken = request.cookies.get('session_token')?.value;
      if (sessionToken) user = await getSessionUser(sessionToken);
    }
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { inviteCode } = await request.json();

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // Validate invite code format (3-30 chars, alphanumeric + underscores/hyphens)
    const cleanCode = inviteCode.trim();
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(cleanCode)) {
      return NextResponse.json({ error: 'Invite code must be 3-30 characters (letters, numbers, _ or -)' }, { status: 400 });
    }

    // Check if code is taken
    const [existing] = await sql`
      SELECT user_id FROM users WHERE invite_code = ${cleanCode} AND user_id != ${user.user_id}
    `;
    if (existing) {
      return NextResponse.json({ error: 'This invite code is already taken' }, { status: 400 });
    }

    await sql`
      UPDATE users SET invite_code = ${cleanCode} WHERE user_id = ${user.user_id}
    `;

    return NextResponse.json({ success: true, inviteCode: cleanCode });
  } catch (error) {
    console.error('Set invite code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
