import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { sendPushNotification } from '@/lib/push-notifications';
import sql from '@/lib/db';

// GET - Fetch messages for a group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { groupId } = await params;

    // Check if user is a member of the group
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Fetch messages with sender info (table uses user_id not sender_id)
    const messages = await sql`
      SELECT 
        gm.message_id,
        gm.user_id as sender_id,
        gm.content,
        gm.created_at,
        u.name as sender_name,
        u.picture as sender_picture
      FROM group_messages gm
      JOIN users u ON gm.user_id = u.user_id
      WHERE gm.group_id = ${groupId}
      ORDER BY gm.created_at ASC
      LIMIT 200
    `;

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('Get group messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Send a message to a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { groupId } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Check if user is a member of the group
    const membership = await sql`
      SELECT role FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${user.user_id}
    `;

    if (membership.length === 0) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Insert message (table uses user_id not sender_id)
    const messageId = generateId('gmsg');
    await sql`
      INSERT INTO group_messages (message_id, group_id, user_id, content, message_type, created_at)
      VALUES (${messageId}, ${groupId}, ${user.user_id}, ${content.trim()}, 'text', NOW())
    `;

    // Update group activity timestamp
    await sql`
      UPDATE groups SET updated_at = NOW() WHERE group_id = ${groupId}
    `;

    // Get group info and members for push notifications
    const groupInfo = await sql`
      SELECT name FROM groups WHERE group_id = ${groupId}
    `;

    // Get all other members' push tokens
    const memberTokens = await sql`
      SELECT pt.token, gm.user_id
      FROM group_members gm
      JOIN push_tokens pt ON gm.user_id = pt.user_id
      WHERE gm.group_id = ${groupId} 
        AND gm.user_id != ${user.user_id}
        AND pt.is_active = true
    `;

    // Send push notifications to all members (async, don't block)
    if (memberTokens.length > 0 && groupInfo.length > 0) {
      const groupName = groupInfo[0].name;
      const preview = content.trim().length > 50 
        ? content.trim().substring(0, 50) + '...' 
        : content.trim();
      
      for (const pt of memberTokens) {
        sendPushNotification(
          pt.token,
          `${groupName}`,
          `${user.name}: ${preview}`,
          { type: 'group_message', groupId }
        ).catch(err => console.error('Push notification error:', err));
      }
    }

    return NextResponse.json({ 
      success: true, 
      messageId,
      message: 'Message sent' 
    });
  } catch (error) {
    console.error('Send group message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
