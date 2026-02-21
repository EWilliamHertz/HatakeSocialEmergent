import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { sendPushNotification, getTradeNotification } from '@/lib/push-notifications';
import sql from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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
        t.cash_requested,
        t.cash_currency,
        i.name as initiator_name,
        i.picture as initiator_picture,
        i.shipping_address as initiator_shipping_address,
        i.payment_swish as initiator_payment_swish,
        i.payment_account as initiator_payment_account,
        i.payment_bankgiro as initiator_payment_bankgiro,
        r.name as recipient_name,
        r.picture as recipient_picture,
        r.shipping_address as recipient_shipping_address,
        r.payment_swish as recipient_payment_swish,
        r.payment_account as recipient_payment_account,
        r.payment_bankgiro as recipient_payment_bankgiro
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
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action || body.status; // Support both action and status

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
    let notifyUserId = '';
    let notifyAction = '';

    // Handle different status updates
    if ((action === 'accept' || action === 'accepted') && trade.receiver_id === user.user_id) {
      await sql`
        UPDATE trades
        SET status = 'accepted', updated_at = NOW()
        WHERE trade_id = ${id}
      `;
      notifyUserId = trade.initiator_id;
      notifyAction = 'accepted';
    } else if ((action === 'reject' || action === 'rejected' || action === 'decline' || action === 'declined') && trade.receiver_id === user.user_id) {
      await sql`
        UPDATE trades
        SET status = 'declined', updated_at = NOW()
        WHERE trade_id = ${id}
      `;
      notifyUserId = trade.initiator_id;
      notifyAction = 'declined';
    } else if ((action === 'complete' || action === 'completed') && trade.status === 'accepted') {
      await sql`
        UPDATE trades
        SET status = 'completed', updated_at = NOW()
        WHERE trade_id = ${id}
      `;
      // Notify both users
      notifyUserId = trade.initiator_id === user.user_id ? trade.receiver_id : trade.initiator_id;
      notifyAction = 'completed';
    } else if ((action === 'cancel' || action === 'cancelled') && trade.initiator_id === user.user_id && trade.status === 'pending') {
      await sql`
        UPDATE trades
        SET status = 'cancelled', updated_at = NOW()
        WHERE trade_id = ${id}
      `;
      notifyUserId = trade.receiver_id;
      notifyAction = 'declined';
    } else {
      return NextResponse.json({ error: 'Invalid action or not authorized' }, { status: 400 });
    }

    // Send push notification
    if (notifyUserId && notifyAction) {
      const pushTokens = await sql`
        SELECT token FROM push_tokens 
        WHERE user_id = ${notifyUserId} AND is_active = true
      `;
      if (pushTokens.length > 0) {
        const notif = getTradeNotification(user.name || 'Someone', notifyAction);
        for (const pt of pushTokens) {
          sendPushNotification(pt.token, notif.title, notif.body, notif.data)
            .catch(err => console.error('Push notification error:', err));
        }
      }
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
