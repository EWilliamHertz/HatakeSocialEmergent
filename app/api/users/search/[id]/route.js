import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 1. Fetch User (Public Data Only)
    const user = await sql`
      SELECT user_id, name, picture, bio, created_at, location 
      FROM users 
      WHERE user_id = ${params.id}
    `;

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch Public Stats (Using your existing schema)
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM collection_items WHERE user_id = ${params.id}) as collection_count,
        (SELECT COUNT(*) FROM marketplace_listings WHERE user_id = ${params.id} AND status = 'active') as active_listings,
        (SELECT COUNT(*) FROM friendships WHERE (user_id = ${params.id} OR friend_id = ${params.id}) AND status = 'accepted') as friend_count
    `;

    return NextResponse.json({ 
      success: true, 
      user: user[0],
      stats: stats[0] 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}