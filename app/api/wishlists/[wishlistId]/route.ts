import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';
import { generateId } from '@/lib/utils';

// GET - Get wishlist details with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wishlistId: string }> }
) {
  try {
    const { wishlistId } = await params;
    const sessionToken = request.cookies.get('session_token')?.value;
    const currentUser = sessionToken ? await getSessionUser(sessionToken) : null;

    // Get wishlist
    const wishlists = await sql`
      SELECT w.*, u.name as user_name, u.picture as user_picture
      FROM wishlists w
      JOIN users u ON w.user_id = u.user_id
      WHERE w.wishlist_id = ${wishlistId}
    `;

    if (wishlists.length === 0) {
      return NextResponse.json({ error: 'Wishlist not found' }, { status: 404 });
    }

    const wishlist = wishlists[0];

    // Check access
    if (!wishlist.is_public && wishlist.user_id !== currentUser?.user_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get items
    const items = await sql`
      SELECT * FROM wishlist_items
      WHERE wishlist_id = ${wishlistId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ 
      success: true, 
      wishlist: {
        ...wishlist,
        items
      }
    });
  } catch (error: any) {
    console.error('Fetch wishlist error:', error);
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
  }
}

// PUT - Update wishlist
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ wishlistId: string }> }
) {
  try {
    const { wishlistId } = await params;
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check ownership
    const wishlists = await sql`
      SELECT * FROM wishlists WHERE wishlist_id = ${wishlistId}
    `;

    if (wishlists.length === 0) {
      return NextResponse.json({ error: 'Wishlist not found' }, { status: 404 });
    }

    if (wishlists[0].user_id !== user.user_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { name, description, isPublic } = await request.json();

    await sql`
      UPDATE wishlists
      SET 
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        is_public = COALESCE(${isPublic}, is_public),
        updated_at = NOW()
      WHERE wishlist_id = ${wishlistId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update wishlist error:', error);
    return NextResponse.json({ error: 'Failed to update wishlist' }, { status: 500 });
  }
}

// DELETE - Delete wishlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ wishlistId: string }> }
) {
  try {
    const { wishlistId } = await params;
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check ownership
    const wishlists = await sql`
      SELECT * FROM wishlists WHERE wishlist_id = ${wishlistId}
    `;

    if (wishlists.length === 0) {
      return NextResponse.json({ error: 'Wishlist not found' }, { status: 404 });
    }

    if (wishlists[0].user_id !== user.user_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete items first, then wishlist
    await sql`DELETE FROM wishlist_items WHERE wishlist_id = ${wishlistId}`;
    await sql`DELETE FROM wishlists WHERE wishlist_id = ${wishlistId}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete wishlist error:', error);
    return NextResponse.json({ error: 'Failed to delete wishlist' }, { status: 500 });
  }
}

// POST to [wishlistId]/items - Add item to wishlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ wishlistId: string }> }
) {
  try {
    const { wishlistId } = await params;
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check ownership
    const wishlists = await sql`
      SELECT * FROM wishlists WHERE wishlist_id = ${wishlistId}
    `;

    if (wishlists.length === 0) {
      return NextResponse.json({ error: 'Wishlist not found' }, { status: 404 });
    }

    if (wishlists[0].user_id !== user.user_id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { cardId, cardData, game, quantity = 1, priority = 'normal', notes = '' } = await request.json();

    if (!cardId || !cardData) {
      return NextResponse.json({ error: 'Card ID and data are required' }, { status: 400 });
    }

    const itemId = generateId('wishitem');

    await sql`
      INSERT INTO wishlist_items (item_id, wishlist_id, card_id, card_data, game, quantity, priority, notes, created_at)
      VALUES (${itemId}, ${wishlistId}, ${cardId}, ${JSON.stringify(cardData)}, ${game || 'mtg'}, ${quantity}, ${priority}, ${notes}, NOW())
    `;

    return NextResponse.json({ 
      success: true, 
      item: { 
        item_id: itemId,
        card_id: cardId,
        card_data: cardData,
        game,
        quantity,
        priority,
        notes
      } 
    });
  } catch (error: any) {
    console.error('Add wishlist item error:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}
