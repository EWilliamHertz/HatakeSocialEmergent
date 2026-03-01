import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────
// GET /api/convention?tab=attendees|traders|wanted|trades
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'attendees';

  try {
    if (tab === 'attendees') {
      // Users who have checked in
      const attendees = await sql`
        SELECT
          u.user_id, u.name, u.picture,
          u.bio,
          cc.checked_in_at,
          (SELECT COUNT(*) FROM trades t WHERE t.seller_id = u.user_id OR t.buyer_id = u.user_id) AS trade_count
        FROM convention_checkins cc
        JOIN users u ON u.user_id = cc.user_id
        ORDER BY cc.checked_in_at DESC
        LIMIT 100
      `;
      return NextResponse.json({ success: true, attendees });
    }

    if (tab === 'traders') {
      // Top traders: most completed trades + reputation
      const traders = await sql`
        SELECT
          u.user_id, u.name, u.picture,
          COALESCE(r.reputation_score, 0) AS reputation_score,
          COUNT(DISTINCT t.trade_id)::int AS completed_trades
        FROM users u
        LEFT JOIN reputations r ON r.user_id = u.user_id
        LEFT JOIN trades t ON (t.seller_id = u.user_id OR t.buyer_id = u.user_id) AND t.status = 'completed'
        GROUP BY u.user_id, u.name, u.picture, r.reputation_score
        HAVING COUNT(DISTINCT t.trade_id) > 0 OR COALESCE(r.reputation_score, 0) > 0
        ORDER BY completed_trades DESC, reputation_score DESC
        LIMIT 20
      `;
      return NextResponse.json({ success: true, traders });
    }

    if (tab === 'wanted') {
      // Most wanted cards across all wishlists
      const wanted = await sql`
        SELECT
          w.card_name,
          w.card_set,
          w.card_image,
          COUNT(*)::int AS want_count,
          json_agg(json_build_object('user_id', u.user_id, 'name', u.name, 'picture', u.picture)) AS wanted_by
        FROM wishlists w
        JOIN users u ON u.user_id = w.user_id
        GROUP BY w.card_name, w.card_set, w.card_image
        ORDER BY want_count DESC
        LIMIT 30
      `;
      return NextResponse.json({ success: true, wanted });
    }

    if (tab === 'trades') {
      // Convention trade board posts
      const trades = await sql`
        SELECT
          ct.trade_id,
          ct.offering,
          ct.looking_for,
          ct.location,
          ct.created_at,
          u.user_id, u.name, u.picture
        FROM convention_trades ct
        JOIN users u ON u.user_id = ct.user_id
        ORDER BY ct.created_at DESC
        LIMIT 50
      `;
      return NextResponse.json({ success: true, trades });
    }

    // Check-in status for current user
    if (tab === 'checkin_status') {
      const result = await sql`
        SELECT checked_in_at FROM convention_checkins WHERE user_id = ${user.user_id} LIMIT 1
      `;
      return NextResponse.json({ success: true, checkedIn: result.length > 0, checkedInAt: result[0]?.checked_in_at || null });
    }

    return NextResponse.json({ success: false, error: 'Invalid tab' }, { status: 400 });
  } catch (error) {
    console.error('GET /api/convention error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load convention data' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/convention
// Body: { action: 'checkin' | 'checkout' | 'post_trade' | 'delete_trade', ... }
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'checkin') {
      await sql`
        INSERT INTO convention_checkins (user_id, checked_in_at)
        VALUES (${user.user_id}, NOW())
        ON CONFLICT (user_id) DO UPDATE SET checked_in_at = NOW()
      `;
      return NextResponse.json({ success: true, message: 'Checked in!' });
    }

    if (action === 'checkout') {
      await sql`DELETE FROM convention_checkins WHERE user_id = ${user.user_id}`;
      return NextResponse.json({ success: true, message: 'Checked out' });
    }

    if (action === 'post_trade') {
      const { offering, looking_for, location } = body;
      if (!offering || !looking_for) {
        return NextResponse.json({ success: false, error: 'offering and looking_for are required' }, { status: 400 });
      }
      const tradeId = uuidv4();
      await sql`
        INSERT INTO convention_trades (trade_id, user_id, offering, looking_for, location, created_at)
        VALUES (${tradeId}, ${user.user_id}, ${offering}, ${looking_for}, ${location || null}, NOW())
      `;
      return NextResponse.json({ success: true, tradeId });
    }

    if (action === 'delete_trade') {
      const { trade_id } = body;
      await sql`
        DELETE FROM convention_trades WHERE trade_id = ${trade_id} AND user_id = ${user.user_id}
      `;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/convention error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
