import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

// POST /api/migrate  (GET also works for easy browser use)
// Safe one-time migration: adds ALL missing columns without touching existing data.
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const results: string[] = [];

  const run = async (label: string, query: string) => {
    try {
      await sql.unsafe(query);
      results.push(`✅ ${label}`);
    } catch (e: any) {
      results.push(`⚠️  ${label}: ${e.message}`);
    }
  };

  // ── conversations ────────────────────────────────────────────────
  await run('conversations: is_group',        `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE`);
  await run('conversations: name',            `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS name TEXT`);
  await run('conversations: created_by',      `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by TEXT`);
  await run('conversations: last_message',    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message TEXT`);
  await run('conversations: last_message_at', `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ`);
  await run('conversations: updated_at',      `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);

  // ── conversation_participants unique constraint ───────────────────
  await run('participants: unique constraint', `
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'conversation_participants_conv_user_key'
      ) THEN
        ALTER TABLE conversation_participants
          ADD CONSTRAINT conversation_participants_conv_user_key
          UNIQUE (conversation_id, user_id);
      END IF;
    END $$
  `);

  // ── messages ─────────────────────────────────────────────────────
  await run('messages: message_type',      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text'`);
  await run('messages: media_url',         `ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT`);
  await run('messages: read_at',           `ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ`);
  await run('messages: reply_to',          `ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to TEXT`);
  await run('messages: reply_content',     `ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_content TEXT`);
  await run('messages: reply_sender_name', `ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_sender_name TEXT`);

  // ── posts (feed) ──────────────────────────────────────────────────
  await run('posts: updated_at', `ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`);
  await run('posts: edited',     `ALTER TABLE posts ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE`);

  // ── events tables ─────────────────────────────────────────────────
  await run('events table', `
    CREATE TABLE IF NOT EXISTS events (
      event_id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      title         TEXT NOT NULL,
      description   TEXT,
      category      TEXT NOT NULL DEFAULT 'tcg',
      tags          TEXT[] DEFAULT '{}',
      venue_name    TEXT,
      venue_address TEXT,
      venue_city    TEXT,
      venue_country TEXT DEFAULT 'Sweden',
      start_date    DATE NOT NULL,
      end_date      DATE,
      start_time    TEXT,
      end_time      TEXT,
      image_url     TEXT,
      website_url   TEXT,
      ticket_url    TEXT,
      is_featured   BOOLEAN DEFAULT FALSE,
      is_hatake     BOOLEAN DEFAULT FALSE,
      is_sold_out   BOOLEAN DEFAULT FALSE,
      is_past       BOOLEAN DEFAULT FALSE,
      created_by    TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await run('event_attendance table', `
    CREATE TABLE IF NOT EXISTS event_attendance (
      id         BIGSERIAL PRIMARY KEY,
      event_id   TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
      user_id    TEXT NOT NULL,
      status     TEXT NOT NULL CHECK (status IN ('going','interested')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (event_id, user_id)
    )
  `);

  await run('event_organizers table', `
    CREATE TABLE IF NOT EXISTS event_organizers (
      id         BIGSERIAL PRIMARY KEY,
      event_id   TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
      user_id    TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'organizer' CHECK (role IN ('organizer','exhibitor')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (event_id, user_id)
    )
  `);

  await run('event_posts table', `
    CREATE TABLE IF NOT EXISTS event_posts (
      post_id    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      event_id   TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
      user_id    TEXT NOT NULL,
      content    TEXT,
      media_urls JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ── seed events if empty ──────────────────────────────────────────
  const existing = await sql`SELECT COUNT(*)::int AS cnt FROM events`;
  if (existing[0].cnt === 0) {
    await run('seed: Svenska Pokémonmässan 2026', `
      INSERT INTO events (title, description, category, tags, venue_name, venue_city, start_date, end_date, start_time, end_time, website_url, ticket_url, is_featured, is_hatake, is_sold_out, is_past)
      VALUES (
        'Svenska Pokémonmässan 2026',
        'Nordens största Pokémon-mässa! Samlare, spelare och fans möts för en helg fylld av trading, turneringar och utställare. Hatake är på plats som utställare!',
        'pokemon',
        ARRAY['pokemon','convention','trading','tcg'],
        'Valandhuset', 'Göteborg',
        '2026-03-07', '2026-03-08', '10:00', '18:00',
        'https://www.pokemonmassan.se/', 'https://www.pokemonmassan.se/',
        TRUE, TRUE, TRUE, FALSE
      )
    `);
    await run('seed: SweCard Jönköping 2026', `
      INSERT INTO events (title, description, category, tags, venue_name, venue_city, start_date, end_date, start_time, end_time, website_url, is_featured, is_past)
      VALUES (
        'SweCard Jönköping 2026',
        'Sveriges ledande TCG-event med turneringar i Pokémon, Magic: The Gathering, Yu-Gi-Oh! och mer.',
        'tcg',
        ARRAY['tcg','pokemon','magic','tournament','convention'],
        'RC Arena', 'Jönköping',
        '2026-05-30', '2026-05-31', '09:00', '19:00',
        'https://swecard.se/',
        TRUE, FALSE
      )
    `);
    await run('seed: SweCard Autumn 2025 (past)', `
      INSERT INTO events (title, description, category, tags, venue_name, venue_city, start_date, end_date, website_url, is_past)
      VALUES (
        'SweCard Autumn 2025',
        'SweCard Autumn 2025 i Svedala – hundratals deltagare och turneringar i Pokémon och Magic.',
        'tcg',
        ARRAY['tcg','pokemon','magic','tournament'],
        'Svedala Arena', 'Svedala',
        '2025-10-11', '2025-10-12',
        'https://swecard.se/',
        TRUE
      )
    `);
  } else {
    results.push(`ℹ️  Events already has ${existing[0].cnt} rows — skipping seed`);
  }

  return NextResponse.json({ success: true, results });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
