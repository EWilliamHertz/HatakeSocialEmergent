import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';
import { generateId } from '@/lib/utils';

// GET - List user's decks
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const decks = await sql`
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM deck_cards WHERE deck_id = d.deck_id) as card_count
      FROM decks d
      WHERE d.user_id = ${user.user_id}
      ORDER BY d.updated_at DESC
    `;

    return NextResponse.json({ success: true, decks });
  } catch (error) {
    console.error('Get decks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new deck
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { name, description, game, format, isPublic } = await request.json();

    if (!name || !game) {
      return NextResponse.json({ error: 'Name and game are required' }, { status: 400 });
    }

    const deckId = generateId('deck');

    await sql`
      INSERT INTO decks (deck_id, user_id, name, description, game, format, is_public)
      VALUES (${deckId}, ${user.user_id}, ${name}, ${description || null}, ${game}, ${format || null}, ${isPublic || false})
    `;

    return NextResponse.json({ success: true, deckId });
  } catch (error) {
    console.error('Create deck error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
