import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getUserFromRequest } from '@/lib/auth';
import { sendFriendRequestEmail } from '@/lib/email';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const friends = await sql`
      SELECT u.user_id, u.name, u.picture, f.status, f.created_at
      FROM friendships f
      JOIN users u ON (f.friend_id = u.user_id AND f.user_id = ${user.user_id})
        OR (f.user_id = u.user_id AND f.friend_id = ${user.user_id})
      WHERE (f.user_id = ${user.user_id} OR f.friend_id = ${user.user_id})
        AND f.status = 'accepted'
        AND u.user_id != ${user.user_id}
    `;

    return NextResponse.json({ success: true, friends });
  } catch (error) {
    console.error('Get friends error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { friendId, action } = await request.json();

    if (!friendId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (action === 'request') {
      // Send friend request
      await sql`
        INSERT INTO friendships (user_id, friend_id, status)
        VALUES (${user.user_id}, ${friendId}, 'pending')
        ON CONFLICT (user_id, friend_id) DO NOTHING
      `;
      
      // Send email notification to recipient (don't block)
      const recipientResult = await sql`
        SELECT email, name FROM users WHERE user_id = ${friendId}
      `;
      if (recipientResult.length > 0) {
        const recipient = recipientResult[0];
        sendFriendRequestEmail(
          recipient.email,
          recipient.name,
          user.name || 'Someone',
          user.picture || null
        ).catch(err => console.error('Failed to send friend request email:', err));
      }
    } else if (action === 'accept') {
      // Accept friend request
      await sql`
        UPDATE friendships
        SET status = 'accepted'
        WHERE friend_id = ${user.user_id} AND user_id = ${friendId}
      `;
    } else if (action === 'reject' || action === 'remove') {
      // Reject or remove friendship
      await sql`
        DELETE FROM friendships
        WHERE (user_id = ${user.user_id} AND friend_id = ${friendId})
          OR (friend_id = ${user.user_id} AND user_id = ${friendId})
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Friend action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}