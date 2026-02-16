import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

const ADMIN_EMAILS = ['zudran@gmail.com', 'ernst@hatake.eu'];

async function isAdmin(sessionToken: string | undefined): Promise<boolean> {
  if (!sessionToken) return false;
  const user = await getSessionUser(sessionToken);
  if (!user) return false;
  return ADMIN_EMAILS.includes(user.email);
}

// GET - List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!await isAdmin(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    let users;
    let totalCount;

    if (search) {
      users = await sql`
        SELECT user_id, name, email, picture, created_at 
        FROM users 
        WHERE name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM users 
        WHERE name ILIKE ${'%' + search + '%'} OR email ILIKE ${'%' + search + '%'}
      `;
      totalCount = Number(countResult[0]?.count || 0);
    } else {
      users = await sql`
        SELECT user_id, name, email, picture, created_at 
        FROM users 
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`SELECT COUNT(*) as count FROM users`;
      totalCount = Number(countResult[0]?.count || 0);
    }

    // Get additional info for each user
    const usersWithInfo = await Promise.all(users.map(async (user: any) => {
      const [postCount, deckCount, collectionCount] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM posts WHERE user_id = ${user.user_id}`.then(r => Number(r[0]?.count || 0)).catch(() => 0),
        sql`SELECT COUNT(*) as count FROM decks WHERE user_id = ${user.user_id}`.then(r => Number(r[0]?.count || 0)).catch(() => 0),
        sql`SELECT COUNT(*) as count FROM collection WHERE user_id = ${user.user_id}`.then(r => Number(r[0]?.count || 0)).catch(() => 0)
      ]);

      return {
        ...user,
        isAdmin: ADMIN_EMAILS.includes(user.email),
        stats: {
          posts: postCount,
          decks: deckCount,
          cards: collectionCount
        }
      };
    }));

    return NextResponse.json({
      success: true,
      users: usersWithInfo,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!await isAdmin(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Check if trying to delete an admin
    const user = await sql`SELECT email FROM users WHERE user_id = ${userId}`;
    if (user.length > 0 && ADMIN_EMAILS.includes(user[0].email)) {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 });
    }

    // Delete user's related data first
    await sql`DELETE FROM posts WHERE user_id = ${userId}`.catch(() => {});
    await sql`DELETE FROM collection WHERE user_id = ${userId}`.catch(() => {});
    await sql`DELETE FROM decks WHERE user_id = ${userId}`.catch(() => {});
    await sql`DELETE FROM friends WHERE user_id = ${userId} OR friend_id = ${userId}`.catch(() => {});
    await sql`DELETE FROM messages WHERE sender_id = ${userId}`.catch(() => {});
    
    // Finally delete the user
    await sql`DELETE FROM users WHERE user_id = ${userId}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
