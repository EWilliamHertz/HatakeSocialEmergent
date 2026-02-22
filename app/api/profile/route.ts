import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch full user profile
    const userProfile = await sql`
      SELECT user_id, name, email, picture, bio, created_at, banner_url,
             shipping_address, payment_swish, payment_clearing, payment_kontonummer,
             payment_iban, payment_swift, invite_code, referral_count
      FROM users
      WHERE user_id = ${user.user_id}
    `;

    return NextResponse.json({ success: true, user: userProfile[0] || user });
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
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { 
      name, 
      bio, 
      picture, 
      banner_url,
      shipping_address,
      payment_swish,
      payment_clearing,
      payment_kontonummer,
      payment_iban,
      payment_swift,
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
        payment_clearing = COALESCE(${payment_clearing}, payment_clearing),
        payment_kontonummer = COALESCE(${payment_kontonummer}, payment_kontonummer),
        payment_iban = COALESCE(${payment_iban}, payment_iban),
        payment_swift = COALESCE(${payment_swift}, payment_swift)
      WHERE user_id = ${user.user_id}
    `;

    const updatedUser = await sql`
      SELECT user_id, name, email, picture, bio, created_at, banner_url,
             shipping_address, payment_swish, payment_clearing, payment_kontonummer,
             payment_iban, payment_swift
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
