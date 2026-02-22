import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, generateToken, createSession } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { sendVerificationEmail } from '@/lib/email';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, inviteCode } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await sql`
      SELECT user_id FROM users WHERE email = ${email}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create user
    const userId = generateId('user');
    const passwordHash = await hashPassword(password);
    const verificationToken = generateId('verify');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await sql`
      INSERT INTO users (user_id, email, name, password_hash, email_verified, verification_token, verification_expires)
      VALUES (${userId}, ${email}, ${name}, ${passwordHash}, false, ${verificationToken}, ${verificationExpires})
    `;

    // Send verification email (don't block on this)
    sendVerificationEmail(email, name, verificationToken).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    // Generate session token
    const sessionToken = generateId('session');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await createSession(userId, sessionToken, expiresAt);

    const user = {
      user_id: userId,
      email,
      name,
      email_verified: false,
    };

    const token = generateToken(user);

    const response = NextResponse.json({
      success: true,
      user,
      token,
      message: 'Please check your email to verify your account',
    });

    // Set session cookie - secure:true for HTTPS (production/preview)
    const isSecure = process.env.NODE_ENV === 'production' || 
                     Boolean(process.env.VERCEL) ||
                     request.headers.get('x-forwarded-proto') === 'https';
    
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: Boolean(isSecure),
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}