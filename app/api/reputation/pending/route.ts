import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

// Get pending trades that need rating
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get completed trades where user hasn't rated yet
    const pendingTrades = await sql`
      SELECT 
        t.trade_id,
        t.completed_at,
        CASE 
          WHEN t.initiator_id = ${user.user_id} THEN t.receiver_id
          ELSE t.initiator_id
        END as other_user_id,
        CASE 
          WHEN t.initiator_id = ${user.user_id} THEN receiver.name
          ELSE initiator.name
        END as other_user_name,
        CASE 
          WHEN t.initiator_id = ${user.user_id} THEN receiver.picture
          ELSE initiator.picture
        END as other_user_picture
      FROM trades t
      JOIN users initiator ON t.initiator_id = initiator.user_id
      JOIN users receiver ON t.receiver_id = receiver.user_id
      WHERE t.status = 'completed'
        AND (t.initiator_id = ${user.user_id} OR t.receiver_id = ${user.user_id})
        AND NOT EXISTS (
          SELECT 1 FROM trade_ratings tr
          WHERE tr.trade_id = t.trade_id AND tr.rater_id = ${user.user_id}
        )
      ORDER BY t.completed_at DESC
    `;

    return NextResponse.json({ 
      success: true,
      pendingTrades,
    });
  } catch (error) {
    console.error('Get pending ratings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
