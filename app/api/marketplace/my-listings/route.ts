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

    const listings = await sql`
      SELECT 
        listing_id,
        card_id,
        game,
        card_data,
        price,
        currency,
        condition,
        foil,
        quantity,
        status,
        created_at
      FROM marketplace_listings
      WHERE user_id = ${user.user_id}
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return NextResponse.json({ 
      success: true, 
      listings 
    });
  } catch (error) {
    console.error('Get my listings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
