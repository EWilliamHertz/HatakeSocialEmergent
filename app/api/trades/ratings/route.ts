import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';
import { generateId } from '@/lib/utils';

// GET - Get ratings for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get all ratings for this user
    const ratings = await sql`
      SELECT tr.*, u.name as rater_name, u.picture as rater_picture
      FROM trade_ratings tr
      JOIN users u ON tr.rater_id = u.user_id
      WHERE tr.rated_user_id = ${userId}
      ORDER BY tr.created_at DESC
    `;

    // Calculate average rating
    const stats = await sql`
      SELECT 
        COUNT(*) as total_ratings,
        COALESCE(AVG(rating), 0) as average_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_ratings
      FROM trade_ratings
      WHERE rated_user_id = ${userId}
    `;

    return NextResponse.json({ 
      success: true, 
      ratings,
      stats: {
        totalRatings: parseInt(stats[0].total_ratings) || 0,
        averageRating: parseFloat(stats[0].average_rating) || 0,
        positiveRatings: parseInt(stats[0].positive_ratings) || 0
      }
    });
  } catch (error: any) {
    console.error('Fetch ratings error:', error);
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
  }
}

// POST - Submit a rating for a completed trade
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { tradeId, ratedUserId, rating, comment } = await request.json();

    if (!tradeId || !ratedUserId || !rating) {
      return NextResponse.json({ error: 'Trade ID, rated user ID, and rating are required' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Verify the trade exists and is completed
    const trades = await sql`
      SELECT * FROM trades WHERE trade_id = ${tradeId}
    `;

    if (trades.length === 0) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const trade = trades[0];

    // Verify user was part of the trade (database uses initiator_id, not sender_id)
    if (trade.initiator_id !== user.user_id && trade.receiver_id !== user.user_id) {
      return NextResponse.json({ error: 'You were not part of this trade' }, { status: 403 });
    }

    // Verify trade is completed
    if (trade.status !== 'completed') {
      return NextResponse.json({ error: 'Can only rate completed trades' }, { status: 400 });
    }

    // Verify rating the other party
    const otherUserId = trade.initiator_id === user.user_id ? trade.receiver_id : trade.initiator_id;
    if (ratedUserId !== otherUserId) {
      return NextResponse.json({ error: 'Can only rate the other trade participant' }, { status: 400 });
    }

    // Check if already rated
    const existingRatings = await sql`
      SELECT * FROM trade_ratings 
      WHERE trade_id = ${tradeId} AND rater_id = ${user.user_id}
    `;

    if (existingRatings.length > 0) {
      return NextResponse.json({ error: 'You have already rated this trade' }, { status: 400 });
    }

    // Create rating
    const ratingId = generateId('rating');

    await sql`
      INSERT INTO trade_ratings (rating_id, trade_id, rater_id, rated_user_id, rating, comment, created_at)
      VALUES (${ratingId}, ${tradeId}, ${user.user_id}, ${ratedUserId}, ${rating}, ${comment || ''}, NOW())
    `;

    return NextResponse.json({ 
      success: true, 
      ratingId 
    });
  } catch (error: any) {
    console.error('Create rating error:', error);
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 });
  }
}
