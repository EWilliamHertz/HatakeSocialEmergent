import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { conversationId } = await params;

    // Verify user is participant
    const participant = await sql`
      SELECT id FROM conversation_participants
      WHERE conversation_id = ${conversationId} AND user_id = ${user.user_id}
    `;

    if (participant.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get messages
    const messages = await sql`
      SELECT m.*, u.name, u.picture
      FROM messages m
      JOIN users u ON m.sender_id = u.user_id
      WHERE m.conversation_id = ${conversationId}
      ORDER BY m.created_at ASC
    `;

    // Mark messages as read
    await sql`
      UPDATE messages
      SET read = true
      WHERE conversation_id = ${conversationId}
        AND sender_id != ${user.user_id}
        AND read = false
    `;

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}