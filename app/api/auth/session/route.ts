import { NextRequest, NextResponse } from 'next/server';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      );
    }

    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    // Call Emergent Auth API to get session data
    const response = await fetch(
      'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
      {
        headers: {
          'X-Session-ID': session_id,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Invalid session_id' },
        { status: 401 }
      );
    }

    const sessionData = await response.json();
    const { id, email, name, picture, session_token } = sessionData;

    // Check if user exists
    const existing = await sql`
      SELECT user_id, email, name, picture, email_verified
      FROM users
      WHERE email = ${email}
    `;

    let userId: string;

    if (existing.length > 0) {
      // Update existing user
      userId = existing[0].user_id;
      await sql`
        UPDATE users
        SET name = ${name}, picture = ${picture}, google_id = ${id}, email_verified = true
        WHERE user_id = ${userId}
      `;
    } else {
      // Create new user
      userId = generateId('user');
      await sql`
        INSERT INTO users (user_id, email, name, picture, google_id, email_verified)
        VALUES (${userId}, ${email}, ${name}, ${picture}, ${id}, true)
      `;
    }

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await sql`
      INSERT INTO user_sessions (user_id, session_token, expires_at)
      VALUES (${userId}, ${session_token}, ${expiresAt})
    `;

    const user = {
      user_id: userId,
      email,
      name,
      picture,
      email_verified: true,
    };

    const jsonResponse = NextResponse.json({
      success: true,
      user,
      session_token,
    });

    // Set session cookie - secure:true for HTTPS (production/preview)
    const isSecure = process.env.NODE_ENV === 'production' || 
                     Boolean(process.env.VERCEL) ||
                     request.headers.get('x-forwarded-proto') === 'https';
    
    jsonResponse.cookies.set('session_token', session_token, {
      httpOnly: true,
      secure: Boolean(isSecure),
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return jsonResponse;
  } catch (error) {
    console.error('Session exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}