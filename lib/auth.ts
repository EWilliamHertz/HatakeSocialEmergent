import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config';
import sql from './db';

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
  is_admin?: boolean;
  created_at?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
}

export async function getUserFromToken(token: string): Promise<User | null> {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const result = await sql`
    SELECT user_id, email, name, picture, email_verified
    FROM users
    WHERE user_id = ${decoded.user_id}
  `;

  return (result[0] as User) || null;
}

export async function createSession(
  userId: string,
  sessionToken: string,
  expiresAt: Date
) {
  await sql`
    INSERT INTO user_sessions (user_id, session_token, expires_at)
    VALUES (${userId}, ${sessionToken}, ${expiresAt})
  `;
}

export async function getSessionUser(
  sessionToken: string
): Promise<User | null> {
  const result = await sql`
    SELECT u.user_id, u.email, u.name, u.picture, u.email_verified, u.is_admin, u.created_at
    FROM users u
    JOIN user_sessions s ON u.user_id = s.user_id
    WHERE s.session_token = ${sessionToken}
      AND s.expires_at > NOW()
  `;

  return (result[0] as User) || null;
}

export async function deleteSession(sessionToken: string) {
  await sql`
    DELETE FROM user_sessions
    WHERE session_token = ${sessionToken}
  `;
}

// Helper to get user from either cookie or Bearer token
export async function getUserFromRequest(request: Request): Promise<User | null> {
  // First try Bearer token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = await getUserFromToken(token);
    if (user) return user;
  }
  
  // Then try session cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const sessionToken = cookies['session_token'];
    if (sessionToken) {
      const user = await getSessionUser(sessionToken);
      if (user) return user;
    }
  }
  
  return null;
}