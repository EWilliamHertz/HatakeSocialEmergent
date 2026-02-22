import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getSessionUser } from '@/lib/auth';
import sql from '@/lib/db';

// Badge types and their requirements
const BADGE_DEFINITIONS: Record<string, {
  name: string;
  description: string;
  icon: string;
  color: string;
  manual?: boolean;
  requirements?: {
    completed_trades?: number;
    collection_size?: number;
    average_rating?: number;
    account_age_days?: number;
    listings_count?: number;
    friends_count?: number;
    groups_count?: number;
    posts_count?: number;
    decks_count?: number;
  };
}> = {
  // Manual badges
  beta_tester: {
    name: 'Beta Tester',
    description: 'Early supporter of Hatake.Social',
    icon: 'flask',
    color: '#8B5CF6',
    manual: true,
  },
  founder: {
    name: 'Founder',
    description: 'Original founding member of Hatake.Social',
    icon: 'star',
    color: '#FFD700',
    manual: true,
  },
  moderator: {
    name: 'Moderator',
    description: 'Community moderator keeping things fair',
    icon: 'shield',
    color: '#6366F1',
    manual: true,
  },
  // Trade milestones
  first_trade: {
    name: 'First Trade',
    description: 'Completed your first trade!',
    icon: 'swap-horizontal',
    color: '#EC4899',
    requirements: { completed_trades: 1 },
  },
  trader_5: {
    name: 'Active Trader',
    description: '5 successful trades',
    icon: 'repeat',
    color: '#F97316',
    requirements: { completed_trades: 5 },
  },
  trader_10: {
    name: 'Experienced Trader',
    description: '10 successful trades',
    icon: 'trending-up',
    color: '#EAB308',
    requirements: { completed_trades: 10 },
  },
  trader_25: {
    name: 'Pro Trader',
    description: '25 successful trades',
    icon: 'ribbon',
    color: '#22C55E',
    requirements: { completed_trades: 25 },
  },
  trader_50: {
    name: 'Master Trader',
    description: '50 successful trades',
    icon: 'medal',
    color: '#14B8A6',
    requirements: { completed_trades: 50 },
  },
  top_trader: {
    name: 'Top Trader',
    description: '100+ successful trades',
    icon: 'trophy',
    color: '#F59E0B',
    requirements: { completed_trades: 100 },
  },
  legendary_trader: {
    name: 'Legendary Trader',
    description: '250+ successful trades',
    icon: 'diamond',
    color: '#A855F7',
    requirements: { completed_trades: 250 },
  },
  // Reputation badges
  verified_seller: {
    name: 'Verified Seller',
    description: 'Trusted trader with excellent reputation',
    icon: 'shield-checkmark',
    color: '#10B981',
    requirements: { completed_trades: 20, average_rating: 4.5, account_age_days: 30 },
  },
  five_star: {
    name: 'Five Star',
    description: 'Perfect 5.0 average rating (10+ ratings)',
    icon: 'star',
    color: '#FBBF24',
    requirements: { completed_trades: 10, average_rating: 5.0 },
  },
  // Collection milestones
  starter_collector: {
    name: 'Starter Collector',
    description: '10+ cards in collection',
    icon: 'copy',
    color: '#60A5FA',
    requirements: { collection_size: 10 },
  },
  collector_50: {
    name: 'Collector',
    description: '50+ cards in collection',
    icon: 'file-tray-stacked',
    color: '#3B82F6',
    requirements: { collection_size: 50 },
  },
  collector_100: {
    name: 'Serious Collector',
    description: '100+ cards in collection',
    icon: 'albums',
    color: '#2563EB',
    requirements: { collection_size: 100 },
  },
  collector_500: {
    name: 'Hoarder',
    description: '500+ cards in collection',
    icon: 'library',
    color: '#1D4ED8',
    requirements: { collection_size: 500 },
  },
  collector_1000: {
    name: 'Vault Keeper',
    description: '1000+ cards in collection',
    icon: 'cube',
    color: '#6D28D9',
    requirements: { collection_size: 1000 },
  },
  // Social badges
  social_butterfly: {
    name: 'Social Butterfly',
    description: '10+ friends on the platform',
    icon: 'people',
    color: '#F472B6',
    requirements: { friends_count: 10 },
  },
  community_leader: {
    name: 'Community Leader',
    description: 'Member of 5+ groups',
    icon: 'globe',
    color: '#34D399',
    requirements: { groups_count: 5 },
  },
  content_creator: {
    name: 'Content Creator',
    description: '20+ posts in the feed',
    icon: 'create',
    color: '#FB923C',
    requirements: { posts_count: 20 },
  },
  // Marketplace badges
  first_listing: {
    name: 'First Listing',
    description: 'Listed your first card for sale',
    icon: 'pricetag',
    color: '#4ADE80',
    requirements: { listings_count: 1 },
  },
  merchant: {
    name: 'Merchant',
    description: '20+ marketplace listings',
    icon: 'storefront',
    color: '#2DD4BF',
    requirements: { listings_count: 20 },
  },
  // Deck building badges
  deck_builder: {
    name: 'Deck Builder',
    description: 'Created your first deck',
    icon: 'layers',
    color: '#818CF8',
    requirements: { decks_count: 1 },
  },
  deck_master: {
    name: 'Deck Master',
    description: '10+ decks created',
    icon: 'construct',
    color: '#7C3AED',
    requirements: { decks_count: 10 },
  },
  // Account age badges
  veteran: {
    name: 'Veteran',
    description: 'Account is 30+ days old',
    icon: 'time',
    color: '#94A3B8',
    requirements: { account_age_days: 30 },
  },
  og_member: {
    name: 'OG Member',
    description: 'Account is 180+ days old',
    icon: 'hourglass',
    color: '#64748B',
    requirements: { account_age_days: 180 },
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

    // Get user stats (all in one query for efficiency)
    const [tradeStats] = await sql`
      SELECT 
        (SELECT COUNT(*) FROM trades WHERE (initiator_id = ${user.user_id} OR receiver_id = ${user.user_id}) AND status = 'completed') as completed_trades,
        (SELECT COUNT(*) FROM collection_items WHERE user_id = ${user.user_id}) as collection_size,
        (SELECT AVG(rating) FROM trade_ratings WHERE rated_user_id = ${user.user_id}) as avg_rating,
        (SELECT created_at FROM users WHERE user_id = ${user.user_id}) as account_created,
        (SELECT COUNT(*) FROM marketplace_listings WHERE user_id = ${user.user_id}) as listings_count,
        (SELECT COUNT(*) FROM friendships WHERE (user_id = ${user.user_id} OR friend_id = ${user.user_id}) AND status = 'accepted') as friends_count,
        (SELECT COUNT(*) FROM group_members WHERE user_id = ${user.user_id}) as groups_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = ${user.user_id}) as posts_count,
        (SELECT COUNT(*) FROM decks WHERE user_id = ${user.user_id}) as decks_count
    `;

    const stats = {
      completedTrades: parseInt(tradeStats?.completed_trades || '0'),
      collectionSize: parseInt(tradeStats?.collection_size || '0'),
      avgRating: parseFloat(tradeStats?.avg_rating || '0'),
      accountAgeDays: tradeStats?.account_created 
        ? Math.floor((Date.now() - new Date(tradeStats.account_created).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      listingsCount: parseInt(tradeStats?.listings_count || '0'),
      friendsCount: parseInt(tradeStats?.friends_count || '0'),
      groupsCount: parseInt(tradeStats?.groups_count || '0'),
      postsCount: parseInt(tradeStats?.posts_count || '0'),
      decksCount: parseInt(tradeStats?.decks_count || '0'),
    };

    // Check each badge
    for (const [badgeType, definition] of Object.entries(BADGE_DEFINITIONS)) {
      if (definition.manual) continue;
      const req = definition.requirements;
      if (!req) continue;

      let qualified = true;
      if (req.completed_trades && stats.completedTrades < req.completed_trades) qualified = false;
      if (req.collection_size && stats.collectionSize < req.collection_size) qualified = false;
      if (req.average_rating && stats.avgRating < req.average_rating) qualified = false;
      if (req.account_age_days && stats.accountAgeDays < req.account_age_days) qualified = false;
      if (req.listings_count && stats.listingsCount < req.listings_count) qualified = false;
      if (req.friends_count && stats.friendsCount < req.friends_count) qualified = false;
      if (req.groups_count && stats.groupsCount < req.groups_count) qualified = false;
      if (req.posts_count && stats.postsCount < req.posts_count) qualified = false;
      if (req.decks_count && stats.decksCount < req.decks_count) qualified = false;

      if (qualified) {
        const [existing] = await sql`
          SELECT 1 FROM user_badges 
          WHERE user_id = ${user.user_id} AND badge_type = ${badgeType}
        `;
        if (!existing) {
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
      stats,
    });
  } catch (error) {
    console.error('Check badges error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
