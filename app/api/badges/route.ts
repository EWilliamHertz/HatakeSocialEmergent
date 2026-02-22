import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

// Badge types and their requirements
const BADGE_DEFINITIONS = {
  beta_tester: {
    name: 'Beta Tester',
    description: 'Early supporter of Hatake.Social',
    icon: 'flask',
    color: '#8B5CF6',
    manual: true, // Admin assigns this
  },
  verified_seller: {
    name: 'Verified Seller',
    description: 'Trusted trader with excellent reputation',
    icon: 'shield-checkmark',
    color: '#10B981',
    requirements: {
      completed_trades: 20,
      average_rating: 4.5,
      account_age_days: 30,
    },
  },
  top_trader: {
    name: 'Top Trader',
    description: '100+ successful trades',
    icon: 'trophy',
    color: '#F59E0B',
    requirements: {
      completed_trades: 100,
    },
  },
  collector: {
    name: 'Collector',
    description: '500+ cards in collection',
    icon: 'albums',
    color: '#3B82F6',
    requirements: {
      collection_size: 500,
    },
  },
  first_trade: {
    name: 'First Trade',
    description: 'Completed your first trade',
    icon: 'swap-horizontal',
    color: '#EC4899',
    requirements: {
      completed_trades: 1,
    },
  },
};

// GET user badges
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Get user's badges from database
    const badges = await sql`
      SELECT * FROM user_badges 
      WHERE user_id = ${userId}
      ORDER BY awarded_at DESC
    `;

    // Add badge definitions
    const badgesWithInfo = badges.map((badge: any) => ({
      ...badge,
      ...(BADGE_DEFINITIONS[badge.badge_type as keyof typeof BADGE_DEFINITIONS] || {}),
    }));

    return NextResponse.json({ success: true, badges: badgesWithInfo });
  } catch (error) {
    console.error('Get badges error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Check and award badges automatically
export async function POST(request: NextRequest) {
  try {
    // Support both auth methods
    let user = await getUserFromRequest(request);
    if (!user) {
      const sessionToken = request.cookies.get('session_token')?.value;
      if (sessionToken) {
        user = await getSessionUser(sessionToken);
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const awardedBadges: string[] = [];

    // Get user stats
    const [tradeStats] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed_trades,
        (SELECT COUNT(*) FROM collection_items WHERE user_id = ${user.user_id}) as collection_size,
        (SELECT AVG(rating) FROM trade_ratings WHERE rated_user_id = ${user.user_id}) as avg_rating,
        (SELECT created_at FROM users WHERE user_id = ${user.user_id}) as account_created
      FROM trades 
      WHERE initiator_id = ${user.user_id} OR receiver_id = ${user.user_id}
    `;

    const completedTrades = parseInt(tradeStats?.completed_trades || '0');
    const collectionSize = parseInt(tradeStats?.collection_size || '0');
    const avgRating = parseFloat(tradeStats?.avg_rating || '0');
    const accountAgeDays = tradeStats?.account_created 
      ? Math.floor((Date.now() - new Date(tradeStats.account_created).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Check each badge
    for (const [badgeType, definition] of Object.entries(BADGE_DEFINITIONS)) {
      if (definition.manual) continue; // Skip manual badges
      
      const requirements = definition.requirements;
      if (!requirements) continue;

      let qualified = true;

      if (requirements.completed_trades && completedTrades < requirements.completed_trades) {
        qualified = false;
      }
      if (requirements.collection_size && collectionSize < requirements.collection_size) {
        qualified = false;
      }
      if (requirements.average_rating && avgRating < requirements.average_rating) {
        qualified = false;
      }
      if (requirements.account_age_days && accountAgeDays < requirements.account_age_days) {
        qualified = false;
      }

      if (qualified) {
        // Check if already has badge
        const [existing] = await sql`
          SELECT 1 FROM user_badges 
          WHERE user_id = ${user.user_id} AND badge_type = ${badgeType}
        `;

        if (!existing) {
          // Award badge
          await sql`
            INSERT INTO user_badges (user_id, badge_type, awarded_at)
            VALUES (${user.user_id}, ${badgeType}, NOW())
          `;
          awardedBadges.push(badgeType);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      newBadges: awardedBadges,
      stats: {
        completedTrades,
        collectionSize,
        avgRating,
        accountAgeDays,
      }
    });
  } catch (error) {
    console.error('Check badges error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
