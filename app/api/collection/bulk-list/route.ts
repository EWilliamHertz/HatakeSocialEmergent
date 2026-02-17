import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

interface ListingItem {
  card_id: string;
  card_data: any;
  game: string;
  price: number;
  condition?: string;
  quantity?: number;
  foil?: boolean;
}

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

    const { listings } = await request.json();

    if (!listings || !Array.isArray(listings) || listings.length === 0) {
      return NextResponse.json(
        { error: 'Listings array is required' },
        { status: 400 }
      );
    }

    // Validate each listing has required fields
    for (const listing of listings) {
      if (!listing.card_id || !listing.game || !listing.card_data || !listing.price) {
        return NextResponse.json(
          { error: 'Each listing must have card_id, game, card_data, and price' },
          { status: 400 }
        );
      }
      if (listing.price <= 0) {
        return NextResponse.json(
          { error: 'Price must be greater than 0' },
          { status: 400 }
        );
      }
    }

    // Create listings for each item
    let listed = 0;
    const createdListings: string[] = [];
    
    for (const listing of listings as ListingItem[]) {
      const listingId = generateId('list');
      await sql`
        INSERT INTO marketplace_listings (
          listing_id, user_id, card_id, game, card_data, price, currency, 
          condition, foil, quantity, status
        )
        VALUES (
          ${listingId},
          ${user.user_id},
          ${listing.card_id},
          ${listing.game},
          ${JSON.stringify(listing.card_data)},
          ${listing.price},
          'EUR',
          ${listing.condition || 'Near Mint'},
          ${listing.foil || false},
          ${listing.quantity || 1},
          'active'
        )
      `;
      listed++;
      createdListings.push(listingId);
    }

    return NextResponse.json({ 
      success: true, 
      listed,
      listingIds: createdListings 
    });
  } catch (error) {
    console.error('Bulk list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
