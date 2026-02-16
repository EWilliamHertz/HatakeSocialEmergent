import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game');
    const format = searchParams.get('format');
    const search = searchParams.get('search');

    // Build query conditions
    let conditions = ['d.is_public = true'];
    const params: any[] = [];
    let paramIndex = 1;

    if (game && game !== 'all') {
      conditions.push(`d.game = $${paramIndex}`);
      params.push(game);
      paramIndex++;
    }

    if (format && format !== 'all') {
      conditions.push(`d.format = $${paramIndex}`);
      params.push(format);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(d.name ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Use raw query with dynamic params
    const query = `
      SELECT 
        d.deck_id,
        d.name,
        d.description,
        d.game,
        d.format,
        d.is_public,
        d.created_at,
        d.updated_at,
        d.user_id,
        u.name as user_name,
        u.picture as user_picture,
        COALESCE((SELECT SUM(quantity) FROM deck_cards WHERE deck_id = d.deck_id), 0) as card_count
      FROM decks d
      LEFT JOIN users u ON d.user_id = u.user_id
      ${whereClause}
      ORDER BY d.updated_at DESC
      LIMIT 50
    `;

    // Execute with params
    let result;
    if (params.length === 0) {
      result = await sql.unsafe(query);
    } else if (params.length === 1) {
      result = await sql.unsafe(query, [params[0]]);
    } else if (params.length === 2) {
      result = await sql.unsafe(query, [params[0], params[1]]);
    } else {
      result = await sql.unsafe(query, params);
    }

    return NextResponse.json({ success: true, decks: result });
  } catch (error: any) {
    console.error('Get community decks error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
