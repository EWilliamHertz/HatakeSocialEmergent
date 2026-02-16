import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';
import { generateId } from '@/lib/utils';

// GET - Get deck details with cards
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { deckId } = await params;

    // Get deck
    const decks = await sql`
      SELECT d.*, u.name as owner_name, u.picture as owner_picture
      FROM decks d
      JOIN users u ON d.user_id = u.user_id
      WHERE d.deck_id = ${deckId}
    `;

    if (decks.length === 0) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const deck = decks[0];

    // Check access
    if (!deck.is_public && deck.user_id !== user.user_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get cards in deck
    const cards = await sql`
      SELECT * FROM deck_cards
      WHERE deck_id = ${deckId}
      ORDER BY category, created_at
    `;

    return NextResponse.json({
      success: true,
      deck,
      cards,
      isOwner: deck.user_id === user.user_id
    });
  } catch (error) {
    console.error('Get deck error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update deck
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { deckId } = await params;

    // Check ownership
    const decks = await sql`
      SELECT user_id FROM decks WHERE deck_id = ${deckId}
    `;

    if (decks.length === 0) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    if (decks[0].user_id !== user.user_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { name, description, format, isPublic } = await request.json();

    await sql`
      UPDATE decks
      SET 
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        format = COALESCE(${format}, format),
        is_public = COALESCE(${isPublic}, is_public),
        updated_at = CURRENT_TIMESTAMP
      WHERE deck_id = ${deckId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update deck error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete deck
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { deckId } = await params;

    // Check ownership
    const decks = await sql`
      SELECT user_id FROM decks WHERE deck_id = ${deckId}
    `;

    if (decks.length === 0) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    if (decks[0].user_id !== user.user_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete deck (cascade will delete cards)
    await sql`DELETE FROM decks WHERE deck_id = ${deckId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete deck error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
