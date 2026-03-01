import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

const ADMIN_EMAILS = ['zudran@gmail.com', 'ernst@hatake.eu'];

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const isAdmin = ADMIN_EMAILS.includes((user as any).email) || (user as any).is_admin;
    if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    // Create table
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

    // Check if already seeded
    const existing = await sql`SELECT COUNT(*) as count FROM events`;
    if (parseInt(existing[0].count) > 0) {
      return NextResponse.json({ message: 'Already seeded', count: existing[0].count });
    }

    // Seed events
    await sql`
      INSERT INTO events (title, description, categories, location_name, location_city, start_date, end_date, start_time, end_time, image_url, website_url, ticket_url, is_sold_out, is_past, featured, hatake_exhibitor)
      VALUES (
        'Svenska Pokémonmässan 2026',
        'Årets mest episka event! Två dagar fyllda med äventyr, samlarskatter och gemenskap. Köp, sälj och byt Pokémon-kort med fans från hela Sverige. Med bytesmarknad, Trade Zone, PSA-gradering, och massa aktiviteter för hela familjen. Valandhuset förvandlas till en samlingsplats för Pokémon-fans i alla åldrar. Hatake är utställare!',
        ARRAY['pokemon', 'tcg', 'convention'],
        'Valandhuset',
        'Göteborg',
        '2026-03-07',
        '2026-03-08',
        '10:00',
        '18:00',
        'https://www.pokemonmassan.se/assets/pikachu-Cy6hVz7n.png',
        'https://www.pokemonmassan.se',
        'https://secure.tickster.com/sv/jcm5v8yvzmrrxwk/selectproductgroup',
        TRUE,
        FALSE,
        TRUE,
        TRUE
      )
    `;

    await sql`
      INSERT INTO events (title, description, categories, location_name, location_city, start_date, end_date, start_time, end_time, image_url, website_url, ticket_url, is_sold_out, is_past, featured, hatake_exhibitor)
      VALUES (
        'SweCard Jönköping 2026',
        'Sveriges största och mest spännande event för samlarkort! SweCard samlar spelare och samlare av Pokémon, Magic: The Gathering, och många andra TCG-spel under ett tak. Kom för att köpa, sälja, byta och tävla. RC Arena i Jönköping fylls med hundratals utställare och tusentals besökare.',
        ARRAY['tcg', 'pokemon', 'magic', 'convention'],
        'RC Arena, Elmiaområdet',
        'Jönköping',
        '2026-05-30',
        '2026-05-31',
        '10:00',
        '18:00',
        'https://swecard.org/wp-content/uploads/2024/01/SweCard-Logo-Transparent.png',
        'https://swecard.org',
        'https://swecard.org',
        FALSE,
        FALSE,
        TRUE,
        FALSE
      )
    `;

    // Past event
    await sql`
      INSERT INTO events (title, description, categories, location_name, location_city, start_date, end_date, start_time, end_time, image_url, website_url, is_sold_out, is_past, featured, hatake_exhibitor)
      VALUES (
        'SweCard Autumn 2025',
        'SweCard i Svedala – Sveriges största mässa för samlarkort. Utställd i Svedala Idrottshall nära Malmö. Alla bord utsålda med rekordmånga utställare och besökare. En stor framgång för den svenska TCG-gemenskapen.',
        ARRAY['tcg', 'pokemon', 'magic', 'convention'],
        'Svedala Idrottshall',
        'Svedala',
        '2025-10-11',
        '2025-10-12',
        '10:00',
        '15:00',
        'https://swecard.org/wp-content/uploads/2024/01/SweCard-Logo-Transparent.png',
        'https://swecard.org',
        TRUE,
        TRUE,
        FALSE,
        FALSE
      )
    `;

    return NextResponse.json({ success: true, message: 'Events seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
