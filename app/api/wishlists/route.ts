import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';
import { generateId } from '@/lib/utils';

// GET - Fetch user's wishlists or public wishlists
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const publicOnly = searchParams.get('public') === 'true';
    
    // Get current user for filtering private wishlists
    const sessionToken = request.cookies.get('session_token')?.value;
    const currentUser = sessionToken ? await getSessionUser(sessionToken) : null;

    let wishlists;
    
    if (userId) {
      // Get specific user's wishlists
      if (userId === currentUser?.user_id) {
        // Current user - show all their wishlists
        wishlists = await sql`
          SELECT w.*, 
            (SELECT COUNT(*) FROM wishlist_items wi WHERE wi.wishlist_id = w.wishlist_id) as item_count
          FROM wishlists w
          WHERE w.user_id = ${userId}
          ORDER BY w.created_at DESC
        `;
      } else {
        // Other user - only show public wishlists
        wishlists = await sql`
          SELECT w.*, 
            (SELECT COUNT(*) FROM wishlist_items wi WHERE wi.wishlist_id = w.wishlist_id) as item_count
          FROM wishlists w
          WHERE w.user_id = ${userId} AND w.is_public = true
          ORDER BY w.created_at DESC
        `;
      }
    } else if (publicOnly) {
      // Get all public wishlists
      wishlists = await sql`
        SELECT w.*, u.name as user_name, u.picture as user_picture,
          (SELECT COUNT(*) FROM wishlist_items wi WHERE wi.wishlist_id = w.wishlist_id) as item_count
        FROM wishlists w
        JOIN users u ON w.user_id = u.user_id
        WHERE w.is_public = true
        ORDER BY w.created_at DESC
        LIMIT 50
      `;
    } else if (currentUser) {
      // Get current user's wishlists
      wishlists = await sql`
        SELECT w.*, 
          (SELECT COUNT(*) FROM wishlist_items wi WHERE wi.wishlist_id = w.wishlist_id) as item_count
        FROM wishlists w
        WHERE w.user_id = ${currentUser.user_id}
        ORDER BY w.created_at DESC
      `;
    } else {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    return NextResponse.json({ success: true, wishlists });
  } catch (error: any) {
    console.error('Fetch wishlists error:', error);
    return NextResponse.json({ error: 'Failed to fetch wishlists' }, { status: 500 });
  }
}

// POST - Create a new wishlist
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

    const { name, description, isPublic = false } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Wishlist name is required' }, { status: 400 });
    }

    const wishlistId = generateId('wishlist');

    await sql`
      INSERT INTO wishlists (wishlist_id, user_id, name, description, is_public, created_at)
      VALUES (${wishlistId}, ${user.user_id}, ${name.trim()}, ${description || ''}, ${isPublic}, NOW())
    `;

    return NextResponse.json({ 
      success: true, 
      wishlist: { 
        wishlist_id: wishlistId, 
        name: name.trim(), 
        description: description || '',
        is_public: isPublic,
        item_count: 0
      } 
    });
  } catch (error: any) {
    console.error('Create wishlist error:', error);
    return NextResponse.json({ error: 'Failed to create wishlist' }, { status: 500 });
  }
}
