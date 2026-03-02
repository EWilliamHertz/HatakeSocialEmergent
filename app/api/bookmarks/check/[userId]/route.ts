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

    // Check if user has bookmarked this collection
    const result = await sql`
      SELECT id FROM collection_bookmarks
      WHERE user_id = ${user.user_id} AND bookmarked_user_id = ${userId}
      LIMIT 1
    `;

    return NextResponse.json({ 
      success: true, 
      bookmarked: result.length > 0 
    });
  } catch (error) {
    console.error('Bookmark check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}