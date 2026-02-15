import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const notifications = await sql`
      SELECT *
      FROM notifications
      WHERE user_id = ${user.user_id}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { notificationId } = await request.json();

    if (notificationId) {
      // Mark single notification as read
      await sql`
        UPDATE notifications
        SET read = true
        WHERE notification_id = ${notificationId} AND user_id = ${user.user_id}
      `;
    } else {
      // Mark all as read
      await sql`
        UPDATE notifications
        SET read = true
        WHERE user_id = ${user.user_id} AND read = false
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { notificationId } = await request.json();

    if (notificationId) {
      // Delete single notification
      await sql`
        DELETE FROM notifications
        WHERE notification_id = ${notificationId} AND user_id = ${user.user_id}
      `;
    } else {
      // Delete all notifications
      await sql`
        DELETE FROM notifications
        WHERE user_id = ${user.user_id}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
