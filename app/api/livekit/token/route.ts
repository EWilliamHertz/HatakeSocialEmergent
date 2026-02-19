import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';

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

    const { roomName, participantName } = await request.json();
    
    if (!roomName) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret) {
      console.error('LiveKit credentials not configured');
      return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 });
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.user_id,
      name: participantName || user.name || 'Anonymous',
      ttl: '2h', // Token valid for 2 hours
    });

    // Grant permissions
    const grant: VideoGrant = {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    };
    at.addGrant(grant);

    const token = await at.toJwt();

    return NextResponse.json({
      success: true,
      token,
      serverUrl: livekitUrl,
      roomName,
      identity: user.user_id,
    });
  } catch (error) {
    console.error('LiveKit token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
