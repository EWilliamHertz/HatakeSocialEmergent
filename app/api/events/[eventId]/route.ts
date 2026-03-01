import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

const ADMIN_EMAILS = ['zudran@gmail.com', 'ernst@hatake.eu'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const isAdmin = ADMIN_EMAILS.includes((user as any).email) || (user as any).is_admin;
    if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { eventId } = await params;
    const body = await request.json();
    const {
      title, description, categories, location_name, location_city,
      location_country, start_date, end_date, start_time, end_time,
      image_url, website_url, ticket_url, is_sold_out, is_past, featured, hatake_exhibitor
    } = body;

    const result = await sql`
      UPDATE events SET
        title = COALESCE(${title}, title),
        description = COALESCE(${description}, description),
        categories = COALESCE(${categories}, categories),
        location_name = COALESCE(${location_name}, location_name),
        location_city = COALESCE(${location_city}, location_city),
        location_country = COALESCE(${location_country}, location_country),
        start_date = COALESCE(${start_date}, start_date),
        end_date = COALESCE(${end_date}, end_date),
        start_time = COALESCE(${start_time}, start_time),
        end_time = COALESCE(${end_time}, end_time),
        image_url = COALESCE(${image_url}, image_url),
        website_url = COALESCE(${website_url}, website_url),
        ticket_url = COALESCE(${ticket_url}, ticket_url),
        is_sold_out = COALESCE(${is_sold_out}, is_sold_out),
        is_past = COALESCE(${is_past}, is_past),
        featured = COALESCE(${featured}, featured),
        hatake_exhibitor = COALESCE(${hatake_exhibitor}, hatake_exhibitor),
        updated_at = NOW()
      WHERE event_id = ${eventId}
      RETURNING *
    `;

    if (result.length === 0) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ event: result[0] });
  } catch (error) {
    console.error('Event PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const isAdmin = ADMIN_EMAILS.includes((user as any).email) || (user as any).is_admin;
    if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { eventId } = await params;
    await sql`DELETE FROM events WHERE event_id = ${eventId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Event DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
