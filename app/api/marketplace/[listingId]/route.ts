import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
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

    const { listingId } = await params;

    // Get the listing to check ownership
    const listings = await sql`
      SELECT l.*, u.role as owner_role
      FROM marketplace_listings l
      JOIN users u ON l.user_id = u.user_id
      WHERE l.listing_id = ${listingId}
    `;

    if (listings.length === 0) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const listing = listings[0];
    const isOwner = listing.user_id === user.user_id;
    const isAdmin = user.is_admin === true;

    // Only owner or admin can delete
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized to delete this listing' }, { status: 403 });
    }

    // Delete the listing
    await sql`DELETE FROM marketplace_listings WHERE listing_id = ${listingId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete listing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
