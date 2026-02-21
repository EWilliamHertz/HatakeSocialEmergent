import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';
import { generateId } from '@/lib/utils';

// Get user's trade reputation stats
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.user_id;

    // Get all ratings for this user
    const ratings = await sql`
      SELECT 
        tr.rating_id,
        tr.trade_id,
        tr.rating,
        tr.comment,
        tr.created_at,
        u.name as rater_name,
        u.picture as rater_picture
      FROM trade_ratings tr
      JOIN users u ON tr.rater_id = u.user_id
      WHERE tr.rated_user_id = ${userId}
      ORDER BY tr.created_at DESC
    `;

    // Calculate stats
    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0 
      ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / totalRatings 
      : 0;

    // Count by star rating
    const ratingDistribution = {
      5: ratings.filter((r: any) => r.rating === 5).length,
      4: ratings.filter((r: any) => r.rating === 4).length,
      3: ratings.filter((r: any) => r.rating === 3).length,
      2: ratings.filter((r: any) => r.rating === 2).length,
      1: ratings.filter((r: any) => r.rating === 1).length,
    };

    // Get completed trade count
    const completedTrades = await sql`
      SELECT COUNT(*) as count
      FROM trades
      WHERE (initiator_id = ${userId} OR receiver_id = ${userId})
        AND status = 'completed'
    `;

    return NextResponse.json({ 
      success: true,
      stats: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings,
        completedTrades: completedTrades[0]?.count || 0,
        ratingDistribution,
      },
      recentRatings: ratings.slice(0, 10), // Return latest 10 reviews
    });
  } catch (error) {
    console.error('Get trade reputation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Submit a rating for a completed trade
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { tradeId, rating, comment } = await request.json();

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (!tradeId) {
      return NextResponse.json(
        { error: 'Trade ID is required' },
        { status: 400 }
      );
    }

    // Get the trade
    const trades = await sql`
      SELECT * FROM trades 
      WHERE trade_id = ${tradeId}
        AND status = 'completed'
        AND (initiator_id = ${user.user_id} OR receiver_id = ${user.user_id})
    `;

    if (trades.length === 0) {
      return NextResponse.json(
        { error: 'Trade not found or not completed' },
        { status: 404 }
      );
    }

    const trade = trades[0];
    
    // Determine who is being rated
    const ratedUserId = trade.initiator_id === user.user_id 
      ? trade.receiver_id 
      : trade.initiator_id;

    // Check if user already rated this trade
    const existingRating = await sql`
      SELECT * FROM trade_ratings 
      WHERE trade_id = ${tradeId} AND rater_id = ${user.user_id}
    `;

    if (existingRating.length > 0) {
      return NextResponse.json(
        { error: 'You have already rated this trade' },
        { status: 400 }
      );
    }

    // Create rating
    const ratingId = generateId('rating');
    await sql`
      INSERT INTO trade_ratings (
        rating_id, trade_id, rater_id, rated_user_id, rating, comment, created_at
      )
      VALUES (
        ${ratingId}, ${tradeId}, ${user.user_id}, ${ratedUserId}, 
        ${rating}, ${comment || null}, NOW()
      )
    `;

    // Create notification for the rated user
    const notifId = generateId('notif');
    await sql`
      INSERT INTO notifications (
        notification_id, user_id, type, title, message, link, read, created_at
      )
      VALUES (
        ${notifId}, ${ratedUserId}, 'rating', 
        'New Trade Rating',
        ${`${user.name} left you a ${rating}-star rating`},
        '/reputation',
        false, NOW()
      )
    `;

    // Send push notification
    const pushTokens = await sql`
      SELECT token FROM push_tokens 
      WHERE user_id = ${ratedUserId} AND is_active = true
    `;

    if (pushTokens.length > 0) {
      const { sendPushNotification, getTradeNotification } = await import('@/lib/push-notifications');
      const notif = getTradeNotification(user.name || 'Someone', 'rating');
      for (const pt of pushTokens) {
        await sendPushNotification(pt.token, notif.title, notif.body, notif.data);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Rating submitted successfully',
      ratingId 
    });
  } catch (error) {
    console.error('Submit trade rating error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
