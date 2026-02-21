import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get all trades where user is initiator or receiver
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
        r.name as recipient_name,
        r.picture as recipient_picture
      FROM trades t
      JOIN users i ON t.initiator_id = i.user_id
      JOIN users r ON t.receiver_id = r.user_id
      WHERE t.initiator_id = ${user.user_id} OR t.receiver_id = ${user.user_id}
      ORDER BY t.updated_at DESC
    `;

    return NextResponse.json({ success: true, trades });
  } catch (error) {
    console.error('Get trades error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { recipientId, initiatorItems, recipientItems, message, cash_requested, cash_currency } = await request.json();

    if (!recipientId) {
      return NextResponse.json(
        { error: 'Recipient is required' },
        { status: 400 }
      );
    }

    const tradeId = generateId('trade');

    // Note: DB schema uses 'receiver_id' and 'initiator_cards/receiver_cards'
    await sql`
      INSERT INTO trades (
        trade_id,
        initiator_id,
        receiver_id,
        initiator_cards,
        receiver_cards,
        message,
        status,
        cash_requested,
        cash_currency
      )
      VALUES (
        ${tradeId},
        ${user.user_id},
        ${recipientId},
        ${JSON.stringify(initiatorItems || [])},
        ${JSON.stringify(recipientItems || [])},
        ${message || null},
        'pending',
        ${cash_requested || null},
        ${cash_currency || null}
      )
    `;

    return NextResponse.json({ success: true, tradeId });
  } catch (error) {
    console.error('Create trade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
