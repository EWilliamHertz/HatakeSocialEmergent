'use server';

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

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
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.user_id;
    cleanupOldSignals();

    // Get signals for this user
    const userSignals = signalStore.get(userId);
    if (userSignals && userSignals.signals.length > 0) {
      const signals = [...userSignals.signals];
      userSignals.signals = [];
      userSignals.lastAccess = Date.now();
      return NextResponse.json({ success: true, signals });
    }

    // Also check database for active calls
    const client = await pool.connect();
    try {
      const activeCallResult = await client.query(
        `SELECT * FROM call_signals 
         WHERE target_user_id = $1 
         AND created_at > NOW() - INTERVAL '30 seconds'
         ORDER BY created_at ASC`,
        [userId]
      );

      if (activeCallResult.rows.length > 0) {
        // Delete the signals after reading
        await client.query(
          `DELETE FROM call_signals WHERE target_user_id = $1`,
          [userId]
        );
        return NextResponse.json({ 
          success: true, 
          signals: activeCallResult.rows.map(r => ({
            type: r.signal_type,
            from: r.from_user_id,
            data: r.signal_data
          }))
        });
      }
    } finally {
      client.release();
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
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.user_id;
    const body = await request.json();
    const { type, target, data } = body;

    if (!type || !target) {
      return NextResponse.json({ success: false, error: 'Missing type or target' }, { status: 400 });
    }

    cleanupOldSignals();

    // Try in-memory first
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

    // Also persist to database for reliability
    const client = await pool.connect();
    try {
      // Ensure table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS call_signals (
          id SERIAL PRIMARY KEY,
          from_user_id VARCHAR(255) NOT NULL,
          target_user_id VARCHAR(255) NOT NULL,
          signal_type VARCHAR(50) NOT NULL,
          signal_data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(
        `INSERT INTO call_signals (from_user_id, target_user_id, signal_type, signal_data)
         VALUES ($1, $2, $3, $4)`,
        [userId, target, type, JSON.stringify(data || {})]
      );

      // Clean up old signals from database
      await client.query(
        `DELETE FROM call_signals WHERE created_at < NOW() - INTERVAL '30 seconds'`
      );
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST calls error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - End a call / clear signals
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.user_id;
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('target');

    // Clear in-memory signals
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

    // Clear from database
    const client = await pool.connect();
    try {
      await client.query(
        `DELETE FROM call_signals WHERE from_user_id = $1 OR target_user_id = $1`,
        [userId]
      );
      
      if (targetId) {
        await client.query(
          `INSERT INTO call_signals (from_user_id, target_user_id, signal_type, signal_data)
           VALUES ($1, $2, 'call_ended', '{}')`,
          [userId, targetId]
        );
      }
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE calls error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
