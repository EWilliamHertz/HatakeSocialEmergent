import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { conversationId } = await params;
  const { searchParams } = new URL(request.url);
  const mediaOnly = searchParams.get('media_only') === 'true';

  try {
    const participation = await sql`
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = ${conversationId}
        AND user_id = ${user.user_id}
      LIMIT 1
    `;

    if (participation.length === 0) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Mark messages as read
    try {
      await sql`
        UPDATE messages
        SET read_at = NOW()
        WHERE conversation_id = ${conversationId}
          AND sender_id != ${user.user_id}
          AND read_at IS NULL
      `;
    } catch (_) {
      // read_at column may not exist yet — safe to ignore
    }

    // ─────────────────────────────────────────────────────────
    // DUPLICATE CONVERSATION FIX
    // For 1-on-1 DMs, find any "twin" conversations with the
    // exact same 2 participants. This handles the case where
    // duplicate conversations were created (is_group=NULL vs FALSE).
    // We merge messages from ALL matching conversations so the
    // user always sees the full history.
    // ─────────────────────────────────────────────────────────
    let allConvIds: string[] = [conversationId];
    try {
      const participantRows = await sql`
        SELECT user_id FROM conversation_participants
        WHERE conversation_id = ${conversationId}
      `;
      if (participantRows.length === 2) {
        const p1 = participantRows[0].user_id as string;
        const p2 = participantRows[1].user_id as string;
        const twins = await sql`
          SELECT c.conversation_id
          FROM conversations c
          WHERE (c.is_group = FALSE OR c.is_group IS NULL)
            AND c.conversation_id != ${conversationId}
            AND EXISTS (
              SELECT 1 FROM conversation_participants
              WHERE conversation_id = c.conversation_id AND user_id = ${p1}
            )
            AND EXISTS (
              SELECT 1 FROM conversation_participants
              WHERE conversation_id = c.conversation_id AND user_id = ${p2}
            )
            AND (
              SELECT COUNT(*) FROM conversation_participants
              WHERE conversation_id = c.conversation_id
            ) = 2
        `;
        if (twins.length > 0) {
          allConvIds = [conversationId, ...twins.map((r: any) => r.conversation_id as string)];
          // Also mark twin conversation messages as read
          for (const twin of twins) {
            try {
              await sql`
                UPDATE messages
                SET read_at = NOW()
                WHERE conversation_id = ${twin.conversation_id}
                  AND sender_id != ${user.user_id}
                  AND read_at IS NULL
              `;
            } catch (_) {}
          }
        }
      }
    } catch (_) {
      // If twin lookup fails, fall back to single conversation
    }

// Fetch messages from all matching conversations (merged & sorted)
    let messages: any[];
    try {
      messages = mediaOnly
        ? await sql`
            SELECT
              m.message_id,
              m.sender_id,
              m.content,
              m.message_type,
              m.media_url,
              m.read_at,
              m.reply_to,
              m.reply_content,
              m.reply_sender_name,
              m.created_at,
              u.name,
              u.picture
            FROM messages m
            JOIN users u ON u.user_id = m.sender_id
            WHERE m.conversation_id = ANY(${allConvIds})
              AND m.message_type IN ('image', 'video')
            ORDER BY m.created_at ASC
          `
        : await sql`
            SELECT * FROM (
              SELECT
                m.message_id,
                m.sender_id,
                m.content,
                m.message_type,
                m.media_url,
                m.read_at,
                m.reply_to,
                m.reply_content,
                m.reply_sender_name,
                m.created_at,
                u.name,
                u.picture
              FROM messages m
              JOIN users u ON u.user_id = m.sender_id
              WHERE m.conversation_id = ANY(${allConvIds})
              ORDER BY m.created_at DESC
              LIMIT 200
            ) AS recent_messages
            ORDER BY recent_messages.created_at ASC
          `;
    } catch (colError) {
      // Fallback: query without new columns if they don't exist yet
      messages = await sql`
        SELECT * FROM (
          SELECT
            m.message_id,
            m.sender_id,
            m.content,
            m.created_at,
            u.name,
            u.picture
          FROM messages m
          JOIN users u ON u.user_id = m.sender_id
          WHERE m.conversation_id = ANY(${allConvIds})
          ORDER BY m.created_at DESC
          LIMIT 200
        ) AS recent_messages
        ORDER BY recent_messages.created_at ASC
      `;
    }
    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error(`GET /api/messages/${conversationId} error:`, error);
    return NextResponse.json({ success: false, error: 'Failed to load messages' }, { status: 500 });
  }
}
