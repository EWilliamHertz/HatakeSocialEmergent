import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // First try Bearer token auth (for mobile app)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      // Use getUserFromRequest which handles both Bearer and cookie auth
      const req = new Request(request.url, {
        headers: request.headers,
      });
      const user = await getUserFromRequest(req);
      if (user) {
        return NextResponse.json({ user });
      }
    }
    
    // Fall back to session cookie auth (for web app)
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await getSessionUser(sessionToken);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}