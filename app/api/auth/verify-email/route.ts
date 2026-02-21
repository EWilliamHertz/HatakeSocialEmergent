import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Find user with this token
    const result = await sql`
      SELECT user_id, email, name, verification_expires
      FROM users
      WHERE verification_token = ${token}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      );
    }

    const user = result[0];

    // Check if token has expired
    if (new Date(user.verification_expires) < new Date()) {
      return NextResponse.json(
        { error: 'Verification token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark email as verified
    await sql`
      UPDATE users
      SET email_verified = true, verification_token = NULL, verification_expires = NULL
      WHERE user_id = ${user.user_id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully!',
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        email_verified: true,
      },
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Resend verification email
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const result = await sql`
      SELECT user_id, name, email_verified
      FROM users
      WHERE email = ${email}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = result[0];

    if (user.email_verified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Generate new verification token
    const { generateId } = await import('@/lib/utils');
    const { sendVerificationEmail } = await import('@/lib/email');
    
    const verificationToken = generateId('verify');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await sql`
      UPDATE users
      SET verification_token = ${verificationToken}, verification_expires = ${verificationExpires}
      WHERE user_id = ${user.user_id}
    `;

    // Send verification email
    await sendVerificationEmail(email, user.name, verificationToken);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
