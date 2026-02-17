import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

// Ensure call_signals table exists
async function ensureTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS call_signals (
        id SERIAL PRIMARY KEY,
        from_user_id VARCHAR(255) NOT NULL,
        target_user_id VARCHAR(255) NOT NULL,
        signal_type VARCHAR(50) NOT NULL,
        signal_data JSONB,
        processed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    // Add processed column if it doesn't exist
    await sql`ALTER TABLE call_signals ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false`;
  } catch (e) {
    // Table/column might already exist
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

    await ensureTable();
    const userId = user.user_id;
    
    // Check if this is preview mode (MessengerWidget) or active mode (VideoCall)
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'active';

    // Get unprocessed signals for this user (last 2 minutes)
    const signals = await sql`
      SELECT id, from_user_id, signal_type, signal_data, created_at
      FROM call_signals 
      WHERE target_user_id = ${userId}
      AND processed = false
      AND created_at > NOW() - INTERVAL '120 seconds'
      ORDER BY created_at ASC
    `;

    if (signals.length > 0) {
      // In preview mode, only mark non-essential signals as processed
      // Keep 'offer' signals unprocessed so VideoCall can receive them later
      if (mode === 'preview') {
        // Only process 'incoming_call' signals - leave 'offer', 'answer', 'ice-candidate' for VideoCall
        const previewIds = signals.filter(s => s.signal_type === 'incoming_call').map(s => s.id);
        if (previewIds.length > 0) {
          await sql`UPDATE call_signals SET processed = true WHERE id = ANY(${previewIds})`;
        }
      } else {
        // In active mode, mark all signals as processed
        const ids = signals.map(s => s.id);
        await sql`UPDATE call_signals SET processed = true WHERE id = ANY(${ids})`;
      }
      
      return NextResponse.json({ 
        success: true, 
        signals: signals.map(s => ({
          type: s.signal_type,
          from: s.from_user_id,
          data: s.signal_data
        }))
      });
    }

    // Clean up old signals (older than 2 minutes)
    await sql`DELETE FROM call_signals WHERE created_at < NOW() - INTERVAL '120 seconds'`;

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

    await ensureTable();
    const userId = user.user_id;
    const body = await request.json();
    const { type, target, data } = body;

    if (!type || !target) {
      return NextResponse.json({ success: false, error: 'Missing type or target' }, { status: 400 });
    }

    // Enrich data with caller info for incoming_call signals
    let enrichedData = data || {};
    if (type === 'incoming_call') {
      enrichedData = {
        ...enrichedData,
        caller_name: user.name || 'Unknown',
        caller_picture: user.picture || null
      };
    }

    // For offers and answers, delete any existing ones first to avoid duplicates
    if (['offer', 'answer'].includes(type)) {
      await sql`
        DELETE FROM call_signals 
        WHERE from_user_id = ${userId} 
        AND target_user_id = ${target} 
        AND signal_type = ${type}
      `;
    }

    // Store signal in database
    await sql`
      INSERT INTO call_signals (from_user_id, target_user_id, signal_type, signal_data, processed)
      VALUES (${userId}, ${target}, ${type}, ${JSON.stringify(enrichedData)}, false)
    `;

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

    await ensureTable();
    const userId = user.user_id;
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('target');

    // Clear signals for this user
    await sql`DELETE FROM call_signals WHERE from_user_id = ${userId} OR target_user_id = ${userId}`;
    
    if (targetId) {
      // Send call_ended signal to the other user
      await sql`
        INSERT INTO call_signals (from_user_id, target_user_id, signal_type, signal_data)
        VALUES (${userId}, ${targetId}, 'call_ended', '{}')
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE calls error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
