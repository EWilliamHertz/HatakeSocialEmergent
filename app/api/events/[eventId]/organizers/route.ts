import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  try {
    const organizers = await sql`
      SELECT eo.user_id, eo.role, eo.assigned_at, u.name, u.picture, u.email
      FROM event_organizers eo
      JOIN users u ON eo.user_id = u.user_id
      WHERE eo.event_id = ${eventId}
      ORDER BY eo.role, u.name
    `;
    return NextResponse.json({ success: true, organizers });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
  const { userId, role } = await req.json();
  try {
    await sql`
      INSERT INTO event_organizers (event_id, user_id, role, assigned_by, assigned_at)
      VALUES (${eventId}, ${userId}, ${role}, ${user.user_id}, NOW())
      ON CONFLICT (event_id, user_id) DO UPDATE SET role = ${role}, assigned_by = ${user.user_id}, assigned_at = NOW()
    `;
    const organizers = await sql`
      SELECT eo.user_id, eo.role, eo.assigned_at, u.name, u.picture, u.email
      FROM event_organizers eo JOIN users u ON eo.user_id = u.user_id
      WHERE eo.event_id = ${eventId} ORDER BY eo.role, u.name
    `;
    return NextResponse.json({ success: true, organizers });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
  const { userId } = await req.json();
  try {
    await sql`DELETE FROM event_organizers WHERE event_id = ${eventId} AND user_id = ${userId}`;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
