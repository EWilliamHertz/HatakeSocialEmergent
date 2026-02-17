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

    // Get collection count
    const collectionResult = await sql`
      SELECT COUNT(*) as count FROM collection_items WHERE user_id = ${user.user_id}
    `;

    // Get listings count
    const listingsResult = await sql`
      SELECT COUNT(*) as count FROM marketplace_listings WHERE user_id = ${user.user_id} AND status = 'active'
    `;

    // Get friends count
    const friendsResult = await sql`
      SELECT COUNT(*) as count FROM friendships 
      WHERE (user_id = ${user.user_id} OR friend_id = ${user.user_id}) AND status = 'accepted'
    `;

    // Get trades count
    const tradesResult = await sql`
      SELECT COUNT(*) as count FROM trades 
      WHERE initiator_id = ${user.user_id} OR receiver_id = ${user.user_id}
    `;

    return NextResponse.json({
      success: true,
      stats: {
        collection_count: parseInt(collectionResult[0]?.count || '0'),
        listings_count: parseInt(listingsResult[0]?.count || '0'),
        friends_count: parseInt(friendsResult[0]?.count || '0'),
        trades_count: parseInt(tradesResult[0]?.count || '0'),
      }
    });
  } catch (error) {
    console.error('Get profile stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
