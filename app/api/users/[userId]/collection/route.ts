import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

// Get a user's collection (public or friends-only)
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

    // Check if viewing own collection or a friend's collection
    const isOwnCollection = currentUser.user_id === userId;
    
    if (!isOwnCollection) {
      // Check if they are friends
      const friendship = await sql`
        SELECT status FROM friendships 
        WHERE ((user_id = ${currentUser.user_id} AND friend_id = ${userId})
          OR (user_id = ${userId} AND friend_id = ${currentUser.user_id}))
        AND status = 'accepted'
      `;

      // For now, allow viewing all collections (social platform)
      // Uncomment below to restrict to friends only:
      // if (friendship.length === 0) {
      //   return NextResponse.json({ error: 'You must be friends to view this collection' }, { status: 403 });
      // }
    }

    // Get the user's collection
    const items = await sql`
      SELECT id, card_id, card_data, game, quantity, condition, foil, finish,
        is_graded, grading_company, grade_value, added_at
      FROM collection_items
      WHERE user_id = ${userId}
      ORDER BY added_at DESC
      LIMIT 100
    `;

    return NextResponse.json({
      success: true,
      items: items,
      count: items.length,
    });
  } catch (error) {
    console.error('Get user collection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
