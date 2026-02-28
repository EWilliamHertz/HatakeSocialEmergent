import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

// GET - Get group chat messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { groupId } = await params;

    // Check if user is a member
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Ensure group_messages table exists
    await sql`
      CREATE TABLE IF NOT EXISTS group_messages (
        message_id VARCHAR(255) PRIMARY KEY,
        group_id VARCHAR(255) NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'text',
        media_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await sql`ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS reply_to VARCHAR(255)`;
    } catch (e) {}

    // Get messages
    const messages = await sql`
      SELECT 
        gm.*,
        u.name,
        u.picture,
        rm.content as reply_content,
        rm.user_id as reply_sender_id,
        ru.name as reply_sender_name
      FROM group_messages gm
      JOIN users u ON gm.user_id = u.user_id
      LEFT JOIN group_messages rm ON gm.reply_to = rm.message_id
      LEFT JOIN users ru ON rm.user_id = ru.user_id
      WHERE gm.group_id = ${groupId}
      ORDER BY gm.created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ 
      success: true, 
      messages: messages.reverse() 
    });
  } catch (error: any) {
    console.error('Get group messages error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Send a message to group chat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { groupId } = await params;

    // Check if user is a member
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    const body = await request.json();
    const { content, messageType = 'text', mediaUrl, replyToId } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 });
    }

    // Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS group_messages (
        message_id VARCHAR(255) PRIMARY KEY,
        group_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'text',
        media_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await sql`ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS reply_to VARCHAR(255)`;
    } catch (e) {}

    const messageId = generateId('gmsg');

    await sql`
      INSERT INTO group_messages (message_id, group_id, user_id, content, message_type, media_url, reply_to)
      VALUES (${messageId}, ${groupId}, ${user.user_id}, ${content || ''}, ${messageType}, ${mediaUrl || null}, ${replyToId || null})
    `;

    // Get the message with user info
    const message = await sql`
      SELECT 
        gm.*,
        u.name,
        u.picture
      FROM group_messages gm
      JOIN users u ON gm.user_id = u.user_id
      WHERE gm.message_id = ${messageId}
    `;

    return NextResponse.json({ success: true, message: message[0] });
  } catch (error: any) {
    console.error('Send group message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}