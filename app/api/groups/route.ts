import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET - Fetch groups (my groups or discover)
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'my';

    let groups;
    
    if (type === 'my') {
      // Fetch groups the user is a member of
      groups = await sql`
        SELECT 
          g.group_id,
          g.name,
          g.description,
          g.image,
          g.privacy,
          g.created_at,
          gm.role,
          (SELECT COUNT(*) FROM group_members WHERE group_id = g.group_id) as member_count
        FROM groups g
        INNER JOIN group_members gm ON g.group_id = gm.group_id
        WHERE gm.user_id = ${user.user_id}
        ORDER BY g.created_at DESC
      `;
    } else {
      // Fetch public groups the user is NOT a member of
      groups = await sql`
        SELECT 
          g.group_id,
          g.name,
          g.description,
          g.image,
          g.privacy,
          g.created_at,
          (SELECT COUNT(*) FROM group_members WHERE group_id = g.group_id) as member_count
        FROM groups g
        WHERE g.privacy = 'public'
        AND g.group_id NOT IN (
          SELECT group_id FROM group_members WHERE user_id = ${user.user_id}
        )
        ORDER BY member_count DESC, g.created_at DESC
        LIMIT 50
      `;
    }

    return NextResponse.json({ success: true, groups });
  } catch (error) {
    console.error('Get groups error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new group
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

    const { name, description, privacy = 'public', image } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const groupId = uuidv4();

    // Create the group
    await sql`
      INSERT INTO groups (group_id, name, description, image, privacy, created_by)
      VALUES (${groupId}, ${name.trim()}, ${description || null}, ${image || null}, ${privacy}, ${user.user_id})
    `;

    // Add creator as admin member
    await sql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${groupId}, ${user.user_id}, 'admin')
    `;

    return NextResponse.json({ success: true, groupId });
  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
