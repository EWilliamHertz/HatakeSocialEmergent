import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getUserFromRequest(req);
  try {
    const counts = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'interested') as interested_count,
        COUNT(*) FILTER (WHERE status = 'going') as going_count
      FROM event_attendance WHERE event_id = ${eventId}
    `;
    let myStatus = null;
    if (user) {
      const row = await sql`
        SELECT status FROM event_attendance WHERE event_id = ${eventId} AND user_id = ${user.user_id}
      `;
      myStatus = row[0]?.status || null;
    }
    return NextResponse.json({
      success: true,
      interestedCount: parseInt(counts[0].interested_count),
      goingCount: parseInt(counts[0].going_count),
      myStatus,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const { status } = await req.json();
  try {
    if (!status) {
      await sql`DELETE FROM event_attendance WHERE event_id = ${eventId} AND user_id = ${user.user_id}`;
    } else {
      await sql`
        INSERT INTO event_attendance (event_id, user_id, status, created_at, updated_at)
        VALUES (${eventId}, ${user.user_id}, ${status}, NOW(), NOW())
        ON CONFLICT (event_id, user_id) DO UPDATE SET status = ${status}, updated_at = NOW()
      `;
    }
    const counts = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'interested') as interested_count,
        COUNT(*) FILTER (WHERE status = 'going') as going_count
      FROM event_attendance WHERE event_id = ${eventId}
    `;
    return NextResponse.json({
      success: true,
      myStatus: status || null,
      interestedCount: parseInt(counts[0].interested_count),
      goingCount: parseInt(counts[0].going_count),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
