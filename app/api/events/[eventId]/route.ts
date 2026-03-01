import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

const ADMIN_EMAILS = ['zudran@gmail.com', 'ernst@hatake.eu'];

// GET /api/events/[eventId]  – fetch a single event for the detail page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const result = await sql`SELECT * FROM events WHERE event_id = ${eventId} LIMIT 1`;
    if (result.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    const row = result[0] as any;

    // Map DB columns → shape expected by the detail page
    const event = {
      event_id:       row.event_id,
      title:          row.title,
      description:    row.description,
      // support both schemas
      category:       (row.categories && row.categories[0]) || row.category || 'tcg',
      categories:     row.categories || (row.category ? [row.category] : []),
      start_date:     row.start_date,
      end_date:       row.end_date || row.start_date,
      start_time:     row.start_time || null,
      end_time:       row.end_time   || null,
      venue:          row.location_name  || row.venue_name  || null,
      city:           row.location_city  || row.venue_city  || null,
      country:        row.location_country || row.venue_country || 'Sweden',
      image_url:      row.image_url  || null,
      website_url:    row.website_url || null,
      ticket_url:     row.ticket_url  || null,
      is_featured:    row.featured    ?? row.is_featured   ?? false,
      is_sold_out:    row.is_sold_out ?? false,
      hatake_present: row.hatake_exhibitor ?? row.is_hatake ?? false,
      is_past:        row.is_past     ?? false,
    };

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Event GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

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

// PUT is an alias for PATCH (some clients send PUT for updates)
export const PUT = PATCH;

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
