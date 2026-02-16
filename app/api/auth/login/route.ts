import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken, createSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find user
    const result = await sql`
      SELECT user_id, email, name, password_hash, picture, email_verified
      FROM users
      WHERE email = ${email}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = result[0];

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate session token
    const sessionToken = generateId('session');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await createSession(user.user_id, sessionToken, expiresAt);

    const userResponse = {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      email_verified: user.email_verified,
    };

    const token = generateToken(userResponse);

    const response = NextResponse.json({
      success: true,
      user: userResponse,
      token,
    });

    // Set session cookie - secure:true for HTTPS (production/preview)
    const isSecure = process.env.NODE_ENV === 'production' || 
                     (typeof window === 'undefined' && process.env.VERCEL) ||
                     request.headers.get('x-forwarded-proto') === 'https';
    
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}