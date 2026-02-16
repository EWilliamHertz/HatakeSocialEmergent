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

    // Get messages
    const messages = await sql`
      SELECT 
        gm.message_id,
        gm.content,
        gm.message_type,
        gm.media_url,
        gm.created_at,
        gm.user_id,
        u.name,
        u.picture
      FROM group_messages gm
      JOIN users u ON gm.user_id = u.user_id
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
    const { content, messageType = 'text', mediaUrl } = body;

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

    const messageId = generateId('gmsg');

    await sql`
      INSERT INTO group_messages (message_id, group_id, user_id, content, message_type, media_url)
      VALUES (${messageId}, ${groupId}, ${user.user_id}, ${content || ''}, ${messageType}, ${mediaUrl || null})
    `;

    // Get the message with user info
    const message = await sql`
      SELECT 
        gm.message_id,
        gm.content,
        gm.message_type,
        gm.media_url,
        gm.created_at,
        gm.user_id,
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
