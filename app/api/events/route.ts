import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

// Initialize events table
async function initEventsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      categories TEXT[] DEFAULT '{}',
      location_name VARCHAR(255),
      location_city VARCHAR(100),
      location_country VARCHAR(100) DEFAULT 'Sweden',
      start_date DATE NOT NULL,
      end_date DATE,
      start_time VARCHAR(20),
      end_time VARCHAR(20),
      image_url TEXT,
      website_url TEXT,
      ticket_url TEXT,
      is_sold_out BOOLEAN DEFAULT FALSE,
      is_past BOOLEAN DEFAULT FALSE,
      featured BOOLEAN DEFAULT FALSE,
      hatake_exhibitor BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET(request: NextRequest) {
  try {
    await initEventsTable();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const showPast = searchParams.get('past') === 'true';

    let events;
    
    if (category && category !== 'all') {
      if (showPast) {
        events = await sql`
          SELECT * FROM events
          WHERE is_past = TRUE AND ${category} = ANY(categories)
          ORDER BY start_date DESC
        `;
      } else {
        events = await sql`
          SELECT * FROM events
          WHERE is_past = FALSE AND ${category} = ANY(categories)
          ORDER BY start_date ASC
        `;
      }
    } else {
      if (showPast) {
        events = await sql`
          SELECT * FROM events WHERE is_past = TRUE ORDER BY start_date DESC
        `;
      } else {
        events = await sql`
          SELECT * FROM events WHERE is_past = FALSE ORDER BY start_date ASC
        `;
      }
    }
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Events GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    
    const ADMIN_EMAILS = ['zudran@gmail.com', 'ernst@hatake.eu'];
    const isAdmin = ADMIN_EMAILS.includes((user as any).email) || (user as any).is_admin || (user as any).role === 'admin';
    if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    await initEventsTable();

    const body = await request.json();
    const {
      title, description, categories, location_name, location_city,
      location_country, start_date, end_date, start_time, end_time,
      image_url, website_url, ticket_url, is_sold_out, featured, hatake_exhibitor
    } = body;

    if (!title || !start_date) {
      return NextResponse.json({ error: 'Title and start_date are required' }, { status: 400 });
    }

    // Auto-detect past
    const isPast = new Date(start_date) < new Date();

    const result = await sql`
      INSERT INTO events (
        title, description, categories, location_name, location_city,
        location_country, start_date, end_date, start_time, end_time,
        image_url, website_url, ticket_url, is_sold_out, is_past, featured, hatake_exhibitor
      ) VALUES (
        ${title}, ${description || null}, ${categories || []}, ${location_name || null},
        ${location_city || null}, ${location_country || 'Sweden'}, ${start_date},
        ${end_date || null}, ${start_time || null}, ${end_time || null},
        ${image_url || null}, ${website_url || null}, ${ticket_url || null},
        ${is_sold_out || false}, ${isPast}, ${featured || false}, ${hatake_exhibitor || false}
      ) RETURNING *
    `;

    return NextResponse.json({ event: result[0] });
  } catch (error) {
    console.error('Events POST error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
