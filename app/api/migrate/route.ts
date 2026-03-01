import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

const ADMIN_EMAILS = ['zudran@gmail.com', 'ernst@hatake.eu'];

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  const email = (user as any)?.email || '';
  const isAdmin = ADMIN_EMAILS.includes(email) || (user as any)?.is_admin;
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const results: string[] = [];
  const run = async (label: string, query: () => Promise<any>) => {
    try { await query(); results.push(`✅ ${label}`); }
    catch (e: any) { results.push(`⚠️ ${label}: ${e.message}`); }
  };

  // users columns
  await run('users: is_admin', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE`);
  await run('users: is_organizer', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_organizer BOOLEAN DEFAULT FALSE`);

  // conversations
  await run('conversations: is_group', () => sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE`);
  await run('conversations: name', () => sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS name VARCHAR(255)`);
  await run('conversations: created_by', () => sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by TEXT`);
  await run('conversations: last_message', () => sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message TEXT`);
  await run('conversations: last_message_at', () => sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP`);
  await run('conversations: updated_at', () => sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);

  // participants unique constraint
  await run('participants: unique constraint', () => sql`ALTER TABLE conversation_participants ADD CONSTRAINT IF NOT EXISTS uq_conv_participant UNIQUE (conversation_id, user_id)`);

  // messages
  await run('messages: message_type', () => sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text'`);
  await run('messages: media_url', () => sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT`);
  await run('messages: read_at', () => sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP`);
  await run('messages: reply_to', () => sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to TEXT`);
  await run('messages: reply_content', () => sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_content TEXT`);
  await run('messages: reply_sender_name', () => sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_sender_name TEXT`);

  // posts
  await run('posts: updated_at', () => sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
  await run('posts: edited', () => sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE`);

  // user_badges table (for badge system)
  await run('user_badges table', () => sql`
    CREATE TABLE IF NOT EXISTS user_badges (
      id SERIAL PRIMARY KEY,
      user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
      badge_type VARCHAR(50) NOT NULL,
      awarded_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, badge_type)
    )
  `);

  // events
  await run('events table', () => sql`
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
  `);
  await run('event_attendance table', () => sql`
    CREATE TABLE IF NOT EXISTS event_attendance (
      id SERIAL PRIMARY KEY,
      event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    )
  `);
  await run('event_organizers table', () => sql`
    CREATE TABLE IF NOT EXISTS event_organizers (
      id SERIAL PRIMARY KEY,
      event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
      role VARCHAR(20) DEFAULT 'organizer',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    )
  `);
  await run('event_posts table', () => sql`
    CREATE TABLE IF NOT EXISTS event_posts (
      id SERIAL PRIMARY KEY,
      event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
      content TEXT,
      media_url TEXT,
      media_type VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Seed events
  await run('seed: Svenska Pokémonmässan 2026', () => sql`
    INSERT INTO events (title, description, categories, location_name, location_city, start_date, end_date, start_time, end_time, website_url, is_sold_out, is_past, featured, hatake_exhibitor)
    VALUES (
      'Svenska Pokémonmässan 2026',
      'Sveriges största Pokémon-event! Träffa samlare, handla kort och delta i tävlingar. Hatake finns på plats!',
      ARRAY['pokemon','tcg','convention'],
      'Valandhuset', 'Göteborg',
      '2026-03-07', '2026-03-08', '10:00', '17:00',
      'https://pokemonmassan.se',
      TRUE, FALSE, TRUE, TRUE
    ) ON CONFLICT DO NOTHING
  `);
  await run('seed: SweCard Jönköping 2026', () => sql`
    INSERT INTO events (title, description, categories, location_name, location_city, start_date, end_date, start_time, end_time, is_sold_out, is_past, featured, hatake_exhibitor)
    VALUES (
      'SweCard Jönköping 2026',
      'SweCard är ett av Sveriges mest populära TCG-event med handel, tävlingar och massa gemenskap.',
      ARRAY['tcg','tournament','convention'],
      'RC Arena', 'Jönköping',
      '2026-05-30', '2026-05-31', '10:00', '18:00',
      FALSE, FALSE, FALSE, FALSE
    ) ON CONFLICT DO NOTHING
  `);
  await run('seed: SweCard Autumn 2025 (past)', () => sql`
    INSERT INTO events (title, description, categories, location_name, location_city, start_date, end_date, is_past, featured)
    VALUES (
      'SweCard Autumn 2025',
      'Höstens stora TCG-träff i Svedala.',
      ARRAY['tcg','convention'],
      'Svedala Arena', 'Svedala',
      '2025-10-11', '2025-10-12',
      TRUE, FALSE
    ) ON CONFLICT DO NOTHING
  `);

  return NextResponse.json({ success: true, results });
}
