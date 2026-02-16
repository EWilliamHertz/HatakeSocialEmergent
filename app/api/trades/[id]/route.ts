import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { id } = await params;

    const trades = await sql`
      SELECT 
        t.trade_id,
        t.status,
        t.created_at,
        t.updated_at,
        t.initiator_id,
        t.receiver_id,
        t.initiator_cards,
        t.receiver_cards,
        t.message,
        i.name as initiator_name,
        i.picture as initiator_picture,
        r.name as recipient_name,
        r.picture as recipient_picture
      FROM trades t
      JOIN users i ON t.initiator_id = i.user_id
      JOIN users r ON t.receiver_id = r.user_id
      WHERE t.trade_id = ${id}
        AND (t.initiator_id = ${user.user_id} OR t.receiver_id = ${user.user_id})
    `;

    if (trades.length === 0) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, trade: trades[0] });
  } catch (error) {
    console.error('Get trade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { id } = await params;
    const { action } = await request.json();

    // Verify user is involved in the trade
    const trades = await sql`
      SELECT * FROM trades 
      WHERE trade_id = ${id}
        AND (initiator_id = ${user.user_id} OR receiver_id = ${user.user_id})
    `;

    if (trades.length === 0) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const trade = trades[0];

    if (action === 'accept' && trade.receiver_id === user.user_id) {
      await sql`
        UPDATE trades
        SET status = 'accepted', updated_at = NOW()
        WHERE trade_id = ${id}
      `;
    } else if (action === 'reject' && trade.receiver_id === user.user_id) {
      await sql`
        UPDATE trades
        SET status = 'rejected', updated_at = NOW()
        WHERE trade_id = ${id}
      `;
    } else if (action === 'complete' && trade.status === 'accepted') {
      await sql`
        UPDATE trades
        SET status = 'completed', updated_at = NOW()
        WHERE trade_id = ${id}
      `;
    } else if (action === 'cancel' && trade.initiator_id === user.user_id && trade.status === 'pending') {
      await sql`
        UPDATE trades
        SET status = 'cancelled', updated_at = NOW()
        WHERE trade_id = ${id}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update trade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
