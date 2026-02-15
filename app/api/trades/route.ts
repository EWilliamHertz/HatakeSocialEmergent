import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';
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

    // Get all trades where user is initiator or recipient
    const trades = await sql`
      SELECT 
        t.trade_id,
        t.status,
        t.created_at,
        t.updated_at,
        t.initiator_id,
        t.recipient_id,
        t.initiator_items,
        t.recipient_items,
        i.name as initiator_name,
        i.picture as initiator_picture,
        r.name as recipient_name,
        r.picture as recipient_picture
      FROM trades t
      JOIN users i ON t.initiator_id = i.user_id
      JOIN users r ON t.recipient_id = r.user_id
      WHERE t.initiator_id = ${user.user_id} OR t.recipient_id = ${user.user_id}
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
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { recipientId, initiatorItems, recipientItems } = await request.json();

    if (!recipientId) {
      return NextResponse.json(
        { error: 'Recipient is required' },
        { status: 400 }
      );
    }

    const tradeId = generateId('trade');

    await sql`
      INSERT INTO trades (
        trade_id,
        initiator_id,
        recipient_id,
        initiator_items,
        recipient_items,
        status
      )
      VALUES (
        ${tradeId},
        ${user.user_id},
        ${recipientId},
        ${JSON.stringify(initiatorItems || [])},
        ${JSON.stringify(recipientItems || [])},
        'pending'
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
