import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const snapshots = await sql`
      SELECT snapshot_date, total_value_eur, card_count
      FROM collection_value_snapshots
      WHERE user_id = ${user.user_id}
      ORDER BY snapshot_date ASC
    `;

    return NextResponse.json({
      success: true,
      snapshots: snapshots.map((s: any) => ({
        date: s.snapshot_date,
        value: parseFloat(s.total_value_eur),
        cardCount: s.card_count,
      })),
    });
  } catch (error: any) {
    console.error('Snapshot fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
