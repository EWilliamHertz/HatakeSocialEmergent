import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/invite/[code] - Validate invite code and get inviter info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const [inviter] = await sql`
      SELECT user_id, name, picture, referral_count 
      FROM users 
      WHERE invite_code = ${code}
    `;

    if (!inviter) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      inviter: {
        name: inviter.name,
        picture: inviter.picture,
        referralCount: parseInt(inviter.referral_count || '0'),
      },
    });
  } catch (error) {
    console.error('Validate invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
