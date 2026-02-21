import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import sql from '@/lib/db';

// Register/update push token for a user
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { token, platform } = await request.json();

    // Validate token format
    if (!token || !token.startsWith('ExponentPushToken[')) {
      return NextResponse.json(
        { error: 'Invalid Expo push token format' },
        { status: 400 }
      );
    }

    // Validate platform
    if (!['ios', 'android', 'web'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be ios, android, or web' },
        { status: 400 }
      );
    }

    // Check if token already exists for this user
    const existing = await sql`
      SELECT id FROM push_tokens 
      WHERE user_id = ${user.user_id} AND token = ${token}
    `;

    if (existing.length > 0) {
      // Update existing token
      await sql`
        UPDATE push_tokens 
        SET platform = ${platform}, 
            is_active = true, 
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE user_id = ${user.user_id} AND token = ${token}
      `;
    } else {
      // Deactivate old tokens for this user on same platform (keep only latest)
      await sql`
        UPDATE push_tokens 
        SET is_active = false 
        WHERE user_id = ${user.user_id} AND platform = ${platform}
      `;

      // Insert new token
      await sql`
        INSERT INTO push_tokens (user_id, token, platform, is_active, created_at, updated_at, last_used_at)
        VALUES (${user.user_id}, ${token}, ${platform}, true, NOW(), NOW(), NOW())
      `;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Push token registered successfully' 
    });
  } catch (error) {
    console.error('Register push token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get user's push notification settings
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tokens = await sql`
      SELECT id, platform, is_active, last_used_at, created_at
      FROM push_tokens 
      WHERE user_id = ${user.user_id}
      ORDER BY last_used_at DESC
    `;

    return NextResponse.json({ 
      success: true, 
      tokens,
      hasActiveTokens: tokens.some((t: any) => t.is_active)
    });
  } catch (error) {
    console.error('Get push tokens error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Deactivate/delete push token
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { token } = await request.json();

    if (token) {
      // Delete specific token
      await sql`
        DELETE FROM push_tokens 
        WHERE user_id = ${user.user_id} AND token = ${token}
      `;
    } else {
      // Delete all tokens for user
      await sql`
        DELETE FROM push_tokens 
        WHERE user_id = ${user.user_id}
      `;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Push token(s) removed' 
    });
  } catch (error) {
    console.error('Delete push token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
