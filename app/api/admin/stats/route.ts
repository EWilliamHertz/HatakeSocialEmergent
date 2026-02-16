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

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!await isAdmin(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get various statistics
    const [
      userCount,
      postCount,
      deckCount,
      collectionCount,
      tradeCount,
      groupCount,
      recentUsers,
      recentPosts
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM users`.then(r => Number(r[0]?.count || 0)),
      sql`SELECT COUNT(*) as count FROM posts`.then(r => Number(r[0]?.count || 0)).catch(() => 0),
      sql`SELECT COUNT(*) as count FROM decks`.then(r => Number(r[0]?.count || 0)).catch(() => 0),
      sql`SELECT COUNT(*) as count FROM collection_items`.then(r => Number(r[0]?.count || 0)).catch(() => 0),
      sql`SELECT COUNT(*) as count FROM trades`.then(r => Number(r[0]?.count || 0)).catch(() => 0),
      sql`SELECT COUNT(*) as count FROM groups`.then(r => Number(r[0]?.count || 0)).catch(() => 0),
      sql`SELECT user_id, name, email, picture, created_at FROM users ORDER BY created_at DESC LIMIT 5`.catch(() => []),
      sql`SELECT p.post_id, p.content, p.created_at, u.name, u.picture FROM posts p JOIN users u ON p.user_id = u.user_id ORDER BY p.created_at DESC LIMIT 5`.catch(() => [])
    ]);

    // Get daily signups for last 7 days
    let dailySignups: any[] = [];
    try {
      dailySignups = await sql`
        SELECT DATE(created_at) as date, COUNT(*) as count 
        FROM users 
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at) 
        ORDER BY date DESC
      `;
    } catch (e) {
      // Table might not have created_at
    }

    return NextResponse.json({
      success: true,
      stats: {
        users: userCount,
        posts: postCount,
        decks: deckCount,
        collections: collectionCount,
        trades: tradeCount,
        groups: groupCount
      },
      recentUsers,
      recentPosts,
      dailySignups
    });
  } catch (error: any) {
    console.error('Get admin stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
