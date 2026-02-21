import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { notificationId } = await request.json();

    if (notificationId) {
      await sql`
        UPDATE notifications
        SET read = true
        WHERE notification_id = ${notificationId} AND user_id = ${user.user_id}
      `;
    } else {
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
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { notificationId } = await request.json();

    if (notificationId) {
      await sql`
        DELETE FROM notifications
        WHERE notification_id = ${notificationId} AND user_id = ${user.user_id}
      `;
    } else {
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
