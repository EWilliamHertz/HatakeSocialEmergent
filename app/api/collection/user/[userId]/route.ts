import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
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

    const { userId } = await params;

    // Get user's collection - use collection_items table (same as main collection endpoint)
    const items = await sql`
      SELECT 
        c.id,
        c.card_id,
        c.game,
        c.quantity,
        c.condition,
        c.foil as is_foil,
        c.card_data
      FROM collection_items c
      WHERE c.user_id = ${userId}
      AND c.quantity > 0
      ORDER BY c.added_at DESC
    `;

    // Transform to match expected format
    const transformedItems = items.map(item => ({
      id: item.id,
      card_id: item.card_id,
      game: item.game,
      quantity: item.quantity,
      condition: item.condition,
      is_foil: item.is_foil,
      card_data: {
        name: item.card_name,
        image_uris: {
          small: item.card_image,
          normal: item.card_image
        },
        set: item.set_code,
        prices: {
          usd: item.market_price?.toString()
        }
      }
    }));

    return NextResponse.json({ success: true, items: transformedItems });
  } catch (error: any) {
    console.error('Get user collection error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
