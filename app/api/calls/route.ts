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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  } catch (e) {
    // Table might already exist
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

    // Get signals for this user (last 60 seconds - increased from 30)
    const signals = await sql`
      SELECT id, from_user_id, signal_type, signal_data, created_at
      FROM call_signals 
      WHERE target_user_id = ${userId}
      AND created_at > NOW() - INTERVAL '60 seconds'
      ORDER BY created_at ASC
    `;

    if (signals.length > 0) {
      // Only delete signals that are NOT offers or answers (keep those for retransmission)
      // Delete ice_candidates and other transient signals
      const idsToDelete = signals
        .filter(s => !['offer', 'answer'].includes(s.signal_type))
        .map(s => s.id);
      
      if (idsToDelete.length > 0) {
        await sql`DELETE FROM call_signals WHERE id = ANY(${idsToDelete})`;
      }
      
      // Mark offers/answers as read by updating their timestamp (so they don't get re-fetched)
      const offerAnswerIds = signals
        .filter(s => ['offer', 'answer'].includes(s.signal_type))
        .map(s => s.id);
      
      if (offerAnswerIds.length > 0) {
        // Delete older duplicates, keep only the newest
        await sql`
          DELETE FROM call_signals 
          WHERE id = ANY(${offerAnswerIds})
          AND created_at < (SELECT MAX(created_at) FROM call_signals WHERE id = ANY(${offerAnswerIds}))
        `;
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

    // Store signal in database
    await sql`
      INSERT INTO call_signals (from_user_id, target_user_id, signal_type, signal_data)
      VALUES (${userId}, ${target}, ${type}, ${JSON.stringify(enrichedData)})
    `;

    // Clean up old signals (older than 1 minute)
    await sql`DELETE FROM call_signals WHERE created_at < NOW() - INTERVAL '60 seconds'`;

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
