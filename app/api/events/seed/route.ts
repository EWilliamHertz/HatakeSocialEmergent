import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !user.is_admin) {
    return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
  }

  try {
    // Events table
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL DEFAULT 'tcg',
        event_type TEXT NOT NULL DEFAULT 'convention',
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NOT NULL,
        venue TEXT,
        city TEXT,
        country TEXT DEFAULT 'Sweden',
        website_url TEXT,
        ticket_url TEXT,
        image_url TEXT,
        is_featured BOOLEAN DEFAULT false,
        is_sold_out BOOLEAN DEFAULT false,
        hatake_present BOOLEAN DEFAULT false,
        organizer_name TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Event attendance table
    await sql`
      CREATE TABLE IF NOT EXISTS event_attendance (
        event_id UUID NOT NULL,
        user_id UUID NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('interested', 'going')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (event_id, user_id)
      )
    `;

    // Event organizers table
    await sql`
      CREATE TABLE IF NOT EXISTS event_organizers (
        event_id UUID NOT NULL,
        user_id UUID NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('organizer', 'exhibitor')),
        assigned_by UUID,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (event_id, user_id)
      )
    `;

    // Event posts table
    await sql`
      CREATE TABLE IF NOT EXISTS event_posts (
        post_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL,
        user_id UUID NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        media_urls JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Seed events
    await sql`DELETE FROM events`;

    await sql`
      INSERT INTO events (title, description, category, event_type, start_date, end_date, venue, city, website_url, ticket_url, is_featured, is_sold_out, hatake_present, organizer_name)
      VALUES (
        'Svenska Pokémonmässan 2026',
        'Sveriges största Pokémon-mässa! Valandhallen i Göteborg fylls med Pokémon-samlare, turneringar, utställare och massor av sällsynta kort. Hatake är på plats som utställare – kom och hälsa på oss! Mässan har förtursbilett till turneringar och ett fantastiskt utbud av vintage och moderna kort.',
        'pokemon',
        'convention',
        '2026-03-07 10:00:00+01',
        '2026-03-08 18:00:00+01',
        'Valandhuset',
        'Göteborg',
        'https://www.pokemonmassan.se',
        'https://www.pokemonmassan.se',
        true,
        true,
        true,
        'Pokémonmässan AB'
      )
    `;

    await sql`
      INSERT INTO events (title, description, category, event_type, start_date, end_date, venue, city, website_url, ticket_url, is_featured, is_sold_out, hatake_present, organizer_name)
      VALUES (
        'SweCard Jönköping 2026',
        'SweCard är Sveriges ledande TCG-mässa med fokus på Pokémon, Magic: The Gathering, One Piece, Yu-Gi-Oh och mycket mer. RC Arena i Jönköping erbjuder ett fantastiskt utrymme för handel, turneringar och träffar med det svenska TCG-communityt.',
        'tcg',
        'convention',
        '2026-05-30 10:00:00+02',
        '2026-05-31 18:00:00+02',
        'RC Arena',
        'Jönköping',
        'https://swecard.se',
        'https://swecard.se',
        true,
        false,
        false,
        'SweCard'
      )
    `;

    await sql`
      INSERT INTO events (title, description, category, event_type, start_date, end_date, venue, city, website_url, is_featured, is_sold_out, hatake_present, organizer_name)
      VALUES (
        'SweCard Höst 2025',
        'SweCard:s höstomgång i Svedala – ett välbesökt TCG-event med stark närvaro av Pokémon och Magic-spelare. Bra handel, trevlig stämning och massor av kort att hitta.',
        'tcg',
        'convention',
        '2025-10-11 10:00:00+02',
        '2025-10-12 18:00:00+02',
        'Svedala Idrottshall',
        'Svedala',
        'https://swecard.se',
        false,
        false,
        false,
        'SweCard'
      )
    `;

    return NextResponse.json({ success: true, message: 'All tables created and events seeded!' });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
