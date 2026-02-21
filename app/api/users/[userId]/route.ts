import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { userId } = await params;

    // Get user profile
    const users = await sql`
      SELECT user_id, name, email, picture, bio, created_at
      FROM users
      WHERE user_id = ${userId}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Get collection count
    const collectionCount = await sql`
      SELECT COUNT(*) as count FROM collections WHERE user_id = ${userId}
    `;

    // Get post count
    const postCount = await sql`
      SELECT COUNT(*) as count FROM posts WHERE user_id = ${userId}
    `;

    // Get friend count
    const friendCount = await sql`
      SELECT COUNT(*) as count FROM friendships 
      WHERE (user_id = ${userId} OR friend_id = ${userId}) AND status = 'accepted'
    `;

    // Check if current user is friends with this user
    const friendship = await sql`
      SELECT status FROM friendships 
      WHERE (user_id = ${currentUser.user_id} AND friend_id = ${userId})
        OR (user_id = ${userId} AND friend_id = ${currentUser.user_id})
    `;

    return NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        name: user.name,
        picture: user.picture,
        bio: user.bio,
        created_at: user.created_at,
        collection_count: Number(collectionCount[0]?.count) || 0,
        post_count: Number(postCount[0]?.count) || 0,
        friend_count: Number(friendCount[0]?.count) || 0,
        is_friend: friendship.length > 0 && friendship[0].status === 'accepted',
        friendship_status: friendship[0]?.status || null,
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
