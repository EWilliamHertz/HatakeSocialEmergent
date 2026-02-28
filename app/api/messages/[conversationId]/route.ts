import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

// ─────────────────────────────────────────────────────────────
// GET /api/messages/[conversationId]
// Returns messages + automatically marks them as read
// ─────────────────────────────────────────────────────────────
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
    // Verify this user is a participant
    const participation = await sql`
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = ${conversationId}
        AND user_id = ${user.user_id}
      LIMIT 1
    `;

    if (participation.length === 0) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // ── Mark all unread messages from others as read ──────────
    // This is the core of read receipts: as soon as the conversation
    // is opened (GET), we stamp read_at = NOW() on all unread messages.
    await sql`
      UPDATE messages
      SET read_at = NOW()
      WHERE conversation_id = ${conversationId}
        AND sender_id        != ${user.user_id}
        AND read_at          IS NULL
    `;

    // ── Fetch messages ────────────────────────────────────────
    const messages = mediaOnly
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
          WHERE m.conversation_id = ${conversationId}
            AND m.message_type IN ('image', 'video')
          ORDER BY m.created_at ASC
        `
      : await sql`
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
          WHERE m.conversation_id = ${conversationId}
          ORDER BY m.created_at ASC
          LIMIT 200
        `;

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error(`GET /api/messages/${conversationId} error:`, error);
    return NextResponse.json({ success: false, error: 'Failed to load messages' }, { status: 500 });
  }
}