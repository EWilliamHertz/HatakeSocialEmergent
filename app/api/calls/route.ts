import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// In-memory signaling store (for serverless compatibility)
// In production, you'd use Redis or a database table
const signalStore: Map<string, {
  signals: any[];
  lastAccess: number;
}> = new Map();

// Clean up old signals (older than 30 seconds)
function cleanupOldSignals() {
  const now = Date.now();
  for (const [key, value] of signalStore.entries()) {
    if (now - value.lastAccess > 30000) {
      signalStore.delete(key);
    }
  }
}

// GET - Poll for incoming signals
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.user_id;
    cleanupOldSignals();

    // Get signals for this user from in-memory store
    const userSignals = signalStore.get(userId);
    if (userSignals && userSignals.signals.length > 0) {
      const signals = [...userSignals.signals];
      userSignals.signals = [];
      userSignals.lastAccess = Date.now();
      return NextResponse.json({ success: true, signals });
    }

    return NextResponse.json({ success: true, signals: [] });
  } catch (error: any) {
    console.error('GET calls error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Send a signal
export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.user_id;
    const body = await request.json();
    const { type, target, data } = body;

    if (!type || !target) {
      return NextResponse.json({ success: false, error: 'Missing type or target' }, { status: 400 });
    }

    cleanupOldSignals();

    // Store signal in memory for the target user
    if (!signalStore.has(target)) {
      signalStore.set(target, { signals: [], lastAccess: Date.now() });
    }
    
    const targetSignals = signalStore.get(target)!;
    targetSignals.signals.push({
      type,
      from: userId,
      data,
      timestamp: Date.now()
    });
    targetSignals.lastAccess = Date.now();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST calls error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - End a call / clear signals
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.user_id;
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('target');

    // Clear in-memory signals for this user
    signalStore.delete(userId);
    
    if (targetId) {
      // Notify the other user that call ended
      if (!signalStore.has(targetId)) {
        signalStore.set(targetId, { signals: [], lastAccess: Date.now() });
      }
      const targetSignals = signalStore.get(targetId)!;
      targetSignals.signals.push({
        type: 'call_ended',
        from: userId,
        timestamp: Date.now()
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE calls error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
