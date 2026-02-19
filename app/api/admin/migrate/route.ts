import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

// POST - Run database migrations
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results: string[] = [];

    // Create wishlists table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS wishlists (
          wishlist_id VARCHAR(50) PRIMARY KEY,
          user_id VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          is_public BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP
        )
      `;
      results.push('Created wishlists table');
    } catch (e: any) {
      results.push(`wishlists: ${e.message}`);
    }

    // Create wishlist_items table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS wishlist_items (
          item_id VARCHAR(50) PRIMARY KEY,
          wishlist_id VARCHAR(50) NOT NULL,
          card_id VARCHAR(255) NOT NULL,
          card_data JSONB,
          game VARCHAR(20) DEFAULT 'mtg',
          quantity INTEGER DEFAULT 1,
          priority VARCHAR(20) DEFAULT 'normal',
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      results.push('Created wishlist_items table');
    } catch (e: any) {
      results.push(`wishlist_items: ${e.message}`);
    }

    // Create trade_ratings table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS trade_ratings (
          rating_id VARCHAR(50) PRIMARY KEY,
          trade_id VARCHAR(50) NOT NULL,
          rater_id VARCHAR(50) NOT NULL,
          rated_user_id VARCHAR(50) NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      results.push('Created trade_ratings table');
    } catch (e: any) {
      results.push(`trade_ratings: ${e.message}`);
    }

    // Add index for faster lookups
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist ON wishlist_items(wishlist_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_trade_ratings_user ON trade_ratings(rated_user_id)`;
      results.push('Created indexes');
    } catch (e: any) {
      results.push(`indexes: ${e.message}`);
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
