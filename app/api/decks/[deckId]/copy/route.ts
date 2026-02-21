import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';
import { generateId } from '@/lib/utils';

// POST - Copy a deck
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { deckId } = await params;

    // Get the original deck
    const [originalDeck] = await sql`
      SELECT * FROM decks WHERE deck_id = ${deckId}
    `;

    if (!originalDeck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    // Check if the deck is public or owned by the user
    if (!originalDeck.is_public && originalDeck.user_id !== user.user_id) {
      return NextResponse.json({ error: 'Cannot copy private deck' }, { status: 403 });
    }

    // Create new deck
    const newDeckId = generateId('deck');
    const newName = `${originalDeck.name} (Copy)`;

    await sql`
      INSERT INTO decks (deck_id, user_id, name, description, game, format, is_public)
      VALUES (
        ${newDeckId}, 
        ${user.user_id}, 
        ${newName}, 
        ${originalDeck.description}, 
        ${originalDeck.game}, 
        ${originalDeck.format}, 
        false
      )
    `;

    // Copy all cards from original deck
    const originalCards = await sql`
      SELECT card_id, card_data, quantity, is_sideboard 
      FROM deck_cards 
      WHERE deck_id = ${deckId}
    `;

    for (const card of originalCards) {
      await sql`
        INSERT INTO deck_cards (deck_id, card_id, card_data, quantity, is_sideboard)
        VALUES (${newDeckId}, ${card.card_id}, ${card.card_data}, ${card.quantity}, ${card.is_sideboard})
      `;
    }

    return NextResponse.json({ 
      success: true, 
      deckId: newDeckId,
      message: `Copied ${originalCards.length} cards to new deck`
    });
  } catch (error) {
    console.error('Copy deck error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
