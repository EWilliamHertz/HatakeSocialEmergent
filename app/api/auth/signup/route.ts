import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth'; // Removed unused imports here
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

    // Check referral code
    let referredBy: string | null = null;
    if (inviteCode) {
      const [inviter] = await sql`
        SELECT user_id FROM users WHERE invite_code = ${inviteCode}
      `;
      if (inviter) {
        referredBy = inviter.user_id;
      }
    }

    await sql`
      INSERT INTO users (user_id, email, name, password_hash, email_verified, verification_token, verification_expires, referred_by)
      VALUES (${userId}, ${email}, ${name}, ${passwordHash}, false, ${verificationToken}, ${verificationExpires}, ${referredBy})
    `;

    // Update referrer's count and award Recruiter badge
    if (referredBy) {
      await sql`UPDATE users SET referral_count = referral_count + 1 WHERE user_id = ${referredBy}`;
      // Award Recruiter badge if not already awarded
      try {
        await sql`
          INSERT INTO user_badges (user_id, badge_type, awarded_at)
          VALUES (${referredBy}, 'recruiter', NOW())
          ON CONFLICT (user_id, badge_type) DO NOTHING
        `;
      } catch (e) { /* badge table might not exist yet */ }
    }

    // Send verification email (don't block on this)
    sendVerificationEmail(email, name, verificationToken).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    // Return success but DO NOT log them in or create a session cookie
    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Please check your email to verify your account before logging in.',
    }); 
    
  } catch (error) { // Formatted this onto its own line
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}