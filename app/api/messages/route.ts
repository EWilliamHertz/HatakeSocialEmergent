import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────
// GET /api/messages
// Returns all conversations for the current user, with unread counts
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all conversations the user is a participant in
    const conversations = await sql`
      SELECT
        c.conversation_id,
        c.is_group,
        c.name        AS group_name,
        c.last_message,
        c.last_message_at,
        -- For DMs: the OTHER participant's info
        other_u.user_id   AS user_id,
        other_u.name      AS name,
        other_u.picture   AS picture,
        -- Unread count: messages not sent by me, not yet read
        COUNT(unread.id)::int AS unread_count
      FROM conversations c
      JOIN conversation_participants cp
        ON cp.conversation_id = c.conversation_id
       AND cp.user_id = ${user.user_id}
      -- For DMs only: join the other participant
      LEFT JOIN conversation_participants other_cp
        ON other_cp.conversation_id = c.conversation_id
       AND other_cp.user_id != ${user.user_id}
       AND c.is_group = FALSE
      LEFT JOIN users other_u
        ON other_u.user_id = other_cp.user_id
      -- Unread messages
      LEFT JOIN messages unread
        ON unread.conversation_id = c.conversation_id
       AND unread.sender_id != ${user.user_id}
       AND unread.read_at IS NULL
      GROUP BY
        c.conversation_id, c.is_group, c.name, c.last_message, c.last_message_at,
        other_u.user_id, other_u.name, other_u.picture
      ORDER BY c.last_message_at DESC NULLS LAST
    `;

    // Shape data for the frontend
    const shaped = conversations.map((row: any) => ({
      conversation_id: row.conversation_id,
      is_group:        row.is_group,
      // For DMs: use the other user's name; for group DMs: use the group name
      name:            row.is_group ? row.group_name : (row.name ?? 'Unknown'),
      picture:         row.is_group ? null : row.picture,
      user_id:         row.is_group ? null : row.user_id,
      last_message:    row.last_message,
      last_message_at: row.last_message_at,
      unread_count:    row.unread_count,
    }));

    return NextResponse.json({ success: true, conversations: shaped });
  } catch (error) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load conversations' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/messages
// Creates a conversation (DM or multi-user group) OR sends a message
//
// Body variants:
//   { recipientId, content }                           → 1-on-1 DM (existing behaviour)
//   { recipientIds: string[], groupName, content }     → NEW multi-user group DM
//   { conversationId, content, ... }                   → Send to existing conversation (group DMs)
//   { recipientId, content, messageType, mediaUrl, replyToId } → DM with media/reply
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      recipientId,
      recipientIds,            // array for group DM creation
      groupName,               // optional label for group DM
      conversationId: existingConversationId, // send to existing conversation
      content,
      messageType = 'text',
      mediaUrl,
      replyToId,
    } = body;

    // ── Case 1: Multi-user group DM ──────────────────────────
    if (recipientIds && Array.isArray(recipientIds) && recipientIds.length > 0) {
      const allParticipants: string[] = [
        user.user_id,
        ...recipientIds.filter((id: string) => id !== user.user_id),
      ];

      if (allParticipants.length < 2) {
        return NextResponse.json({ success: false, error: 'Need at least 2 participants' }, { status: 400 });
      }

      const conversationId = uuidv4();
      const chatName = groupName?.trim() || null;

      // Create conversation
      await sql`
        INSERT INTO conversations (conversation_id, is_group, name, created_by)
        VALUES (${conversationId}, TRUE, ${chatName}, ${user.user_id})
      `;

      // Add all participants
      for (const participantId of allParticipants) {
        await sql`
          INSERT INTO conversation_participants (conversation_id, user_id)
          VALUES (${conversationId}, ${participantId})
          ON CONFLICT (conversation_id, user_id) DO NOTHING
        `;
      }

      // Send opening message if provided
      if (content?.trim()) {
        const messageId = uuidv4();
        await sql`
          INSERT INTO messages (message_id, conversation_id, sender_id, content, message_type)
          VALUES (${messageId}, ${conversationId}, ${user.user_id}, ${content.trim()}, 'text')
        `;
        await sql`
          UPDATE conversations
          SET last_message = ${content.trim()}, last_message_at = NOW()
          WHERE conversation_id = ${conversationId}
        `;
      }

      return NextResponse.json({ success: true, conversationId, isGroup: true });
    }

    // ── Case 2: Send to existing conversation by ID (group DMs) ──
    if (existingConversationId) {
      // Verify user is a participant in this conversation
      const participation = await sql`
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = ${existingConversationId} AND user_id = ${user.user_id}
        LIMIT 1
      `;

      if (participation.length === 0) {
        return NextResponse.json({ success: false, error: 'Not a participant in this conversation' }, { status: 403 });
      }

      if (content || mediaUrl) {
        const messageId = uuidv4();
        const msgContent = content || (messageType === 'image' ? '📷 Image' : '🎥 Video');

        // Resolve reply content if replyToId provided
        let replyContent = null;
        let replySenderName = null;
        if (replyToId) {
          const replyMsg = await sql`
            SELECT m.content, u.name
            FROM messages m
            JOIN users u ON u.user_id = m.sender_id
            WHERE m.message_id = ${replyToId}
            LIMIT 1
          `;
          if (replyMsg.length > 0) {
            replyContent    = replyMsg[0].content;
            replySenderName = replyMsg[0].name;
          }
        }

        await sql`
          INSERT INTO messages
            (message_id, conversation_id, sender_id, content, message_type, media_url, reply_to, reply_content, reply_sender_name)
          VALUES
            (${messageId}, ${existingConversationId}, ${user.user_id}, ${msgContent}, ${messageType}, ${mediaUrl || null},
             ${replyToId || null}, ${replyContent}, ${replySenderName})
        `;

        await sql`
          UPDATE conversations
          SET last_message = ${msgContent}, last_message_at = NOW(), updated_at = NOW()
          WHERE conversation_id = ${existingConversationId}
        `;
      }

      return NextResponse.json({ success: true, conversationId: existingConversationId });
    }

    // ── Case 3: 1-on-1 DM (original behaviour, preserved exactly) ──
    if (!recipientId) {
      return NextResponse.json({ success: false, error: 'recipientId, recipientIds, or conversationId required' }, { status: 400 });
    }

    // Find existing 1-on-1 (non-group) conversation between these two users
    const existing = await sql`
      SELECT c.conversation_id
      FROM conversations c
      JOIN conversation_participants cp1
        ON cp1.conversation_id = c.conversation_id AND cp1.user_id = ${user.user_id}
      JOIN conversation_participants cp2
        ON cp2.conversation_id = c.conversation_id AND cp2.user_id = ${recipientId}
      WHERE c.is_group = FALSE
      LIMIT 1
    `;

    let conversationId: string;

    if (existing.length > 0) {
      conversationId = existing[0].conversation_id;
    } else {
      // Create new 1-on-1 conversation
      conversationId = uuidv4();
      await sql`
        INSERT INTO conversations (conversation_id, is_group)
        VALUES (${conversationId}, FALSE)
      `;
      await sql`
        INSERT INTO conversation_participants (conversation_id, user_id)
        VALUES (${conversationId}, ${user.user_id}), (${conversationId}, ${recipientId})
      `;
    }

    // Send the message
    if (content || mediaUrl) {
      const messageId = uuidv4();
      const msgContent = content || (messageType === 'image' ? '📷 Image' : '🎥 Video');

      // Resolve reply content if replyToId provided
      let replyContent = null;
      let replySenderName = null;
      if (replyToId) {
        const replyMsg = await sql`
          SELECT m.content, u.name
          FROM messages m
          JOIN users u ON u.user_id = m.sender_id
          WHERE m.message_id = ${replyToId}
          LIMIT 1
        `;
        if (replyMsg.length > 0) {
          replyContent   = replyMsg[0].content;
          replySenderName = replyMsg[0].name;
        }
      }

      await sql`
        INSERT INTO messages
          (message_id, conversation_id, sender_id, content, message_type, media_url, reply_to, reply_content, reply_sender_name)
        VALUES
          (${messageId}, ${conversationId}, ${user.user_id}, ${msgContent}, ${messageType}, ${mediaUrl || null},
           ${replyToId || null}, ${replyContent}, ${replySenderName})
      `;

      await sql`
        UPDATE conversations
        SET last_message = ${msgContent}, last_message_at = NOW(), updated_at = NOW()
        WHERE conversation_id = ${conversationId}
      `;
    }

    return NextResponse.json({ success: true, conversationId });
  } catch (error) {
    console.error('POST /api/messages error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
