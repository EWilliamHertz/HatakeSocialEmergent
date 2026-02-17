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

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { 
      name, 
      bio, 
      picture, 
      banner_url,
      shipping_address,
      payment_swish,
      payment_bankgiro,
      payment_account 
    } = await request.json();

    await sql`
      UPDATE users
      SET 
        name = COALESCE(${name}, name),
        bio = COALESCE(${bio}, bio),
        picture = COALESCE(${picture}, picture),
        banner_url = COALESCE(${banner_url}, banner_url),
        shipping_address = COALESCE(${shipping_address}, shipping_address),
        payment_swish = COALESCE(${payment_swish}, payment_swish),
        payment_bankgiro = COALESCE(${payment_bankgiro}, payment_bankgiro),
        payment_account = COALESCE(${payment_account}, payment_account)
      WHERE user_id = ${user.user_id}
    `;

    const updatedUser = await sql`
      SELECT user_id, name, email, picture, bio, created_at, banner_url,
             shipping_address, payment_swish, payment_bankgiro, payment_account
      FROM users
      WHERE user_id = ${user.user_id}
    `;

    return NextResponse.json({ success: true, user: updatedUser[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
