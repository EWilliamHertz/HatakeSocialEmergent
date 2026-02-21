import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';
import { generateId } from '@/lib/utils';

// GET - Fetch cards in deck
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { deckId } = await params;

    // Check if deck exists and user has access
    const decks = await sql`
      SELECT user_id, is_public FROM decks WHERE deck_id = ${deckId}
    `;

    if (decks.length === 0) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const deck = decks[0];
    if (deck.user_id !== user.user_id && !deck.is_public) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const cards = await sql`
      SELECT 
        id,
        card_id,
        card_data,
        quantity,
        category as is_sideboard
      FROM deck_cards
      WHERE deck_id = ${deckId}
      ORDER BY card_data->>'name' ASC
    `;

    // Transform for frontend compatibility
    const formattedCards = cards.map(c => ({
      ...c,
      is_sideboard: c.is_sideboard === 'sideboard',
    }));

    return NextResponse.json({ success: true, cards: formattedCards });
  } catch (error) {
    console.error('Get deck cards error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add card to deck
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

    // Check ownership
    const decks = await sql`
      SELECT user_id, game FROM decks WHERE deck_id = ${deckId}
    `;

    if (decks.length === 0) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    if (decks[0].user_id !== user.user_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { cardId, cardData, quantity, category } = await request.json();

    if (!cardId || !cardData) {
      return NextResponse.json({ error: 'Card data is required' }, { status: 400 });
    }

    // Check if card already exists in deck
    const existing = await sql`
      SELECT id, quantity FROM deck_cards
      WHERE deck_id = ${deckId} AND card_id = ${cardId}
    `;

    if (existing.length > 0) {
      // Update quantity
      const newQuantity = existing[0].quantity + (quantity || 1);
      await sql`
        UPDATE deck_cards
        SET quantity = ${newQuantity}, updated_at = CURRENT_TIMESTAMP
        WHERE deck_id = ${deckId} AND card_id = ${cardId}
      `;
    } else {
      // Add new card
      const cardEntryId = generateId('dcard');
      await sql`
        INSERT INTO deck_cards (entry_id, deck_id, card_id, card_data, quantity, category)
        VALUES (${cardEntryId}, ${deckId}, ${cardId}, ${JSON.stringify(cardData)}, ${quantity || 1}, ${category || 'main'})
      `;
    }

    // Update deck timestamp
    await sql`UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE deck_id = ${deckId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add card to deck error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove card from deck
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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

    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');

    if (!cardId) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }

    await sql`
      DELETE FROM deck_cards
      WHERE deck_id = ${deckId} AND card_id = ${cardId}
    `;

    // Update deck timestamp
    await sql`UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE deck_id = ${deckId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove card from deck error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update card quantity or category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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

    const { cardId, quantity, category } = await request.json();

    if (!cardId) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 });
    }

    if (quantity !== undefined && quantity <= 0) {
      // Remove card if quantity is 0 or less
      await sql`
        DELETE FROM deck_cards
        WHERE deck_id = ${deckId} AND card_id = ${cardId}
      `;
    } else {
      await sql`
        UPDATE deck_cards
        SET 
          quantity = COALESCE(${quantity}, quantity),
          category = COALESCE(${category}, category),
          updated_at = CURRENT_TIMESTAMP
        WHERE deck_id = ${deckId} AND card_id = ${cardId}
      `;
    }

    // Update deck timestamp
    await sql`UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE deck_id = ${deckId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update deck card error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
