import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game');
    const format = searchParams.get('format');
    const search = searchParams.get('search');

    // Build a simpler query using postgres.js template literals
    let result;
    
    if (game && game !== 'all' && format && format !== 'all' && search) {
      result = await sql`
        SELECT 
          d.deck_id, d.name, d.description, d.game, d.format,
          d.is_public, d.created_at, d.updated_at, d.user_id,
          u.name as user_name, u.picture as user_picture,
          COALESCE((SELECT SUM(quantity) FROM deck_cards WHERE deck_id = d.deck_id), 0) as card_count
        FROM decks d
        LEFT JOIN users u ON d.user_id = u.user_id
        WHERE d.is_public = true
          AND d.game = ${game}
          AND d.format = ${format}
          AND (d.name ILIKE ${'%' + search + '%'} OR d.description ILIKE ${'%' + search + '%'})
        ORDER BY d.updated_at DESC
        LIMIT 50
      `;
    } else if (game && game !== 'all' && format && format !== 'all') {
      result = await sql`
        SELECT 
          d.deck_id, d.name, d.description, d.game, d.format,
          d.is_public, d.created_at, d.updated_at, d.user_id,
          u.name as user_name, u.picture as user_picture,
          COALESCE((SELECT SUM(quantity) FROM deck_cards WHERE deck_id = d.deck_id), 0) as card_count
        FROM decks d
        LEFT JOIN users u ON d.user_id = u.user_id
        WHERE d.is_public = true
          AND d.game = ${game}
          AND d.format = ${format}
        ORDER BY d.updated_at DESC
        LIMIT 50
      `;
    } else if (game && game !== 'all' && search) {
      result = await sql`
        SELECT 
          d.deck_id, d.name, d.description, d.game, d.format,
          d.is_public, d.created_at, d.updated_at, d.user_id,
          u.name as user_name, u.picture as user_picture,
          COALESCE((SELECT SUM(quantity) FROM deck_cards WHERE deck_id = d.deck_id), 0) as card_count
        FROM decks d
        LEFT JOIN users u ON d.user_id = u.user_id
        WHERE d.is_public = true
          AND d.game = ${game}
          AND (d.name ILIKE ${'%' + search + '%'} OR d.description ILIKE ${'%' + search + '%'})
        ORDER BY d.updated_at DESC
        LIMIT 50
      `;
    } else if (format && format !== 'all' && search) {
      result = await sql`
        SELECT 
          d.deck_id, d.name, d.description, d.game, d.format,
          d.is_public, d.created_at, d.updated_at, d.user_id,
          u.name as user_name, u.picture as user_picture,
          COALESCE((SELECT SUM(quantity) FROM deck_cards WHERE deck_id = d.deck_id), 0) as card_count
        FROM decks d
        LEFT JOIN users u ON d.user_id = u.user_id
        WHERE d.is_public = true
          AND d.format = ${format}
          AND (d.name ILIKE ${'%' + search + '%'} OR d.description ILIKE ${'%' + search + '%'})
        ORDER BY d.updated_at DESC
        LIMIT 50
      `;
    } else if (game && game !== 'all') {
      result = await sql`
        SELECT 
          d.deck_id, d.name, d.description, d.game, d.format,
          d.is_public, d.created_at, d.updated_at, d.user_id,
          u.name as user_name, u.picture as user_picture,
          COALESCE((SELECT SUM(quantity) FROM deck_cards WHERE deck_id = d.deck_id), 0) as card_count
        FROM decks d
        LEFT JOIN users u ON d.user_id = u.user_id
        WHERE d.is_public = true AND d.game = ${game}
        ORDER BY d.updated_at DESC
        LIMIT 50
      `;
    } else if (format && format !== 'all') {
      result = await sql`
        SELECT 
          d.deck_id, d.name, d.description, d.game, d.format,
          d.is_public, d.created_at, d.updated_at, d.user_id,
          u.name as user_name, u.picture as user_picture,
          COALESCE((SELECT SUM(quantity) FROM deck_cards WHERE deck_id = d.deck_id), 0) as card_count
        FROM decks d
        LEFT JOIN users u ON d.user_id = u.user_id
        WHERE d.is_public = true AND d.format = ${format}
        ORDER BY d.updated_at DESC
        LIMIT 50
      `;
    } else if (search) {
      result = await sql`
        SELECT 
          d.deck_id, d.name, d.description, d.game, d.format,
          d.is_public, d.created_at, d.updated_at, d.user_id,
          u.name as user_name, u.picture as user_picture,
          COALESCE((SELECT SUM(quantity) FROM deck_cards WHERE deck_id = d.deck_id), 0) as card_count
        FROM decks d
        LEFT JOIN users u ON d.user_id = u.user_id
        WHERE d.is_public = true
          AND (d.name ILIKE ${'%' + search + '%'} OR d.description ILIKE ${'%' + search + '%'})
        ORDER BY d.updated_at DESC
        LIMIT 50
      `;
    } else {
      result = await sql`
        SELECT 
          d.deck_id, d.name, d.description, d.game, d.format,
          d.is_public, d.created_at, d.updated_at, d.user_id,
          u.name as user_name, u.picture as user_picture,
          COALESCE((SELECT SUM(quantity) FROM deck_cards WHERE deck_id = d.deck_id), 0) as card_count
        FROM decks d
        LEFT JOIN users u ON d.user_id = u.user_id
        WHERE d.is_public = true
        ORDER BY d.updated_at DESC
        LIMIT 50
      `;
    }

    return NextResponse.json({ success: true, decks: result });
  } catch (error: any) {
    console.error('Get community decks error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
