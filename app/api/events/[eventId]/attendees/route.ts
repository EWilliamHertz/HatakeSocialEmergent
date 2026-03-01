import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  try {
    const attendees = status
      ? await sql`
          SELECT ea.user_id, ea.status, ea.created_at, u.name, u.picture, u.bio
          FROM event_attendance ea
          JOIN users u ON ea.user_id = u.user_id
          WHERE ea.event_id = ${eventId} AND ea.status = ${status}
          ORDER BY ea.created_at DESC LIMIT 100
        `
      : await sql`
          SELECT ea.user_id, ea.status, ea.created_at, u.name, u.picture, u.bio
          FROM event_attendance ea
          JOIN users u ON ea.user_id = u.user_id
          WHERE ea.event_id = ${eventId}
          ORDER BY ea.status, ea.created_at DESC LIMIT 200
        `;
    return NextResponse.json({ success: true, attendees });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
