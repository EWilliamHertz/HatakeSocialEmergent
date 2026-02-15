import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

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

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Item IDs are required' },
        { status: 400 }
      );
    }

    // Delete all items that belong to the user
    for (const id of ids) {
      await sql`
        DELETE FROM collection_items
        WHERE id = ${id} AND user_id = ${user.user_id}
      `;
    }

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
