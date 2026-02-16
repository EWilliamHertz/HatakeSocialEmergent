import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';
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

    // Get all conversations for the user
    const conversations = await sql`
      SELECT DISTINCT
        c.conversation_id,
        c.updated_at,
        u.user_id,
        u.name,
        u.picture,
        m.content as last_message,
        m.created_at as last_message_at,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.conversation_id AND sender_id != ${user.user_id} AND read = false) as unread_count
      FROM conversations c
      JOIN conversation_participants cp ON c.conversation_id = cp.conversation_id
      JOIN conversation_participants cp2 ON c.conversation_id = cp2.conversation_id AND cp2.user_id = ${user.user_id}
      JOIN users u ON cp.user_id = u.user_id AND u.user_id != ${user.user_id}
      LEFT JOIN LATERAL (
        SELECT content, created_at
        FROM messages
        WHERE conversation_id = c.conversation_id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON true
      WHERE cp.user_id != ${user.user_id}
      ORDER BY c.updated_at DESC
    `;

    return NextResponse.json({ success: true, conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const { recipientId, content, messageType, mediaUrl } = await request.json();

    if (!recipientId || (!content && !mediaUrl)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if conversation exists
    const existing = await sql`
      SELECT c.conversation_id
      FROM conversations c
      JOIN conversation_participants cp1 ON c.conversation_id = cp1.conversation_id AND cp1.user_id = ${user.user_id}
      JOIN conversation_participants cp2 ON c.conversation_id = cp2.conversation_id AND cp2.user_id = ${recipientId}
    `;

    let conversationId;

    if (existing.length > 0) {
      conversationId = existing[0].conversation_id;
    } else {
      // Create new conversation
      conversationId = generateId('conv');
      await sql`
        INSERT INTO conversations (conversation_id)
        VALUES (${conversationId})
      `;
      await sql`
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (${conversationId}, ${user.user_id}), (${conversationId}, ${recipientId})
      `;
    }

    // Send message
    const messageId = generateId('msg');
    await sql`
      INSERT INTO messages (message_id, conversation_id, sender_id, content, message_type, media_url)
      VALUES (${messageId}, ${conversationId}, ${user.user_id}, ${content || ''}, ${messageType || 'text'}, ${mediaUrl || null})
    `;

    // Update conversation timestamp
    await sql`
      UPDATE conversations
      SET updated_at = NOW()
      WHERE conversation_id = ${conversationId}
    `;

    return NextResponse.json({ success: true, conversationId, messageId });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}