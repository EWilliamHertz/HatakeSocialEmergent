import { NextResponse } from 'next/server';

// All available badge definitions
const BADGE_DEFINITIONS: Record<string, { name: string; description: string; icon: string; color: string; category: string }> = {
  beta_tester: { name: 'Beta Tester', description: 'Early supporter of Hatake.Social', icon: 'flask', color: '#8B5CF6', category: 'Special' },
  founder: { name: 'Founder', description: 'Original founding member', icon: 'star', color: '#FFD700', category: 'Special' },
  moderator: { name: 'Moderator', description: 'Community moderator', icon: 'shield', color: '#6366F1', category: 'Special' },
  recruiter: { name: 'Recruiter', description: 'Invited a friend to Hatake.Social', icon: 'person-add', color: '#F43F5E', category: 'Special' },
  first_trade: { name: 'First Trade', description: 'Completed your first trade!', icon: 'swap-horizontal', color: '#EC4899', category: 'Trading' },
  trader_5: { name: 'Active Trader', description: '5 successful trades', icon: 'repeat', color: '#F97316', category: 'Trading' },
  trader_10: { name: 'Experienced Trader', description: '10 successful trades', icon: 'trending-up', color: '#EAB308', category: 'Trading' },
  trader_25: { name: 'Pro Trader', description: '25 successful trades', icon: 'ribbon', color: '#22C55E', category: 'Trading' },
  trader_50: { name: 'Master Trader', description: '50 successful trades', icon: 'medal', color: '#14B8A6', category: 'Trading' },
  top_trader: { name: 'Top Trader', description: '100+ successful trades', icon: 'trophy', color: '#F59E0B', category: 'Trading' },
  legendary_trader: { name: 'Legendary Trader', description: '250+ successful trades', icon: 'diamond', color: '#A855F7', category: 'Trading' },
  verified_seller: { name: 'Verified Seller', description: 'Trusted trader with excellent reputation', icon: 'shield-checkmark', color: '#10B981', category: 'Reputation' },
  five_star: { name: 'Five Star', description: 'Perfect 5.0 average rating', icon: 'star', color: '#FBBF24', category: 'Reputation' },
  starter_collector: { name: 'Starter Collector', description: '10+ cards in collection', icon: 'copy', color: '#60A5FA', category: 'Collection' },
  collector_50: { name: 'Collector', description: '50+ cards in collection', icon: 'file-tray-stacked', color: '#3B82F6', category: 'Collection' },
  collector_100: { name: 'Serious Collector', description: '100+ cards in collection', icon: 'albums', color: '#2563EB', category: 'Collection' },
  collector_500: { name: 'Hoarder', description: '500+ cards in collection', icon: 'library', color: '#1D4ED8', category: 'Collection' },
  collector_1000: { name: 'Vault Keeper', description: '1000+ cards in collection', icon: 'cube', color: '#6D28D9', category: 'Collection' },
  social_butterfly: { name: 'Social Butterfly', description: '10+ friends', icon: 'people', color: '#F472B6', category: 'Social' },
  community_leader: { name: 'Community Leader', description: 'Member of 5+ groups', icon: 'globe', color: '#34D399', category: 'Social' },
  content_creator: { name: 'Content Creator', description: '20+ posts in feed', icon: 'create', color: '#FB923C', category: 'Social' },
  first_listing: { name: 'First Listing', description: 'Listed your first card', icon: 'pricetag', color: '#4ADE80', category: 'Marketplace' },
  merchant: { name: 'Merchant', description: '20+ marketplace listings', icon: 'storefront', color: '#2DD4BF', category: 'Marketplace' },
  deck_builder: { name: 'Deck Builder', description: 'Created your first deck', icon: 'layers', color: '#818CF8', category: 'Deck Building' },
  deck_master: { name: 'Deck Master', description: '10+ decks created', icon: 'construct', color: '#7C3AED', category: 'Deck Building' },
  veteran: { name: 'Veteran', description: '30+ days on the platform', icon: 'time', color: '#94A3B8', category: 'Account' },
  og_member: { name: 'OG Member', description: '180+ days on the platform', icon: 'hourglass', color: '#64748B', category: 'Account' },
};

export async function GET() {
  const badges = Object.entries(BADGE_DEFINITIONS).map(([key, value]) => ({
    badge_type: key,
    ...value,
  }));

  return NextResponse.json({ success: true, badges });
}
