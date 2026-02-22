# Hatake.Social - TCG Trading Platform PRD

## Original Problem Statement
Create a comprehensive full-stack TCG (Trading Card Game) social platform with card management, marketplace, social features, and trading capabilities. Includes a Next.js web app and React Native (Expo) mobile app.

## Tech Stack
- **Web:** Next.js 16+, TypeScript, Tailwind CSS, PostgreSQL (Neon), Cloudinary, Scryfall/TCGdex APIs, Resend, LiveKit
- **Mobile:** React Native (Expo), React Navigation
- **Test Credentials:** test@test.com / password

---

## COMPLETED FEATURES

### Session 15 - Deck Analytics, Badge Showcase & Format Validation (2026-02-22)

1. **Deck Statistics/Analytics (Mobile)** - Full analytics added to mobile deck detail view:
   - Average mana cost (CMC) display
   - Color distribution with colored pip indicators (WUBRG)
   - Card type distribution with bar charts (Creature, Instant, Sorcery, etc.)
   - Format validation with issue warnings (card count, copy limits, sideboard)
   - "Deck is [Format] legal" confirmation when all rules pass
   
2. **Badge Showcase in Feed** - Badges visible on social feed posts:
   - Feed API (GET /api/feed) returns `badge_count` and `top_badge` for each post author
   - Web feed: Award icon + badge count shown next to usernames (links to profile)
   - Mobile feed: Ribbon icon + count indicator next to usernames
   - Color-coded based on top badge type

3. **Format Validation (Mobile)** - Validates decks against format rules:
   - MTG: Standard, Modern, Pioneer, Legacy, Vintage, Commander, Pauper
   - Pokemon: Standard (60 cards exact)
   - Checks: min/max card count, copy limits, sideboard size

### Session 14 - Badge System & Bug Verification (2026-02-22)

1. **Comprehensive Badge System** - 26 badge types across 7 categories
   - Trading (7): First Trade → Legendary Trader (250+)
   - Collection (5): Starter (10+) → Vault Keeper (1000+)
   - Social (3): Social Butterfly, Community Leader, Content Creator
   - Marketplace (2): First Listing, Merchant
   - Deck Building (2): Deck Builder, Deck Master
   - Reputation (2): Verified Seller, Five Star
   - Special (3): Beta Tester, Founder, Moderator (admin manual)
   - Account Age (2): Veteran (30d), OG Member (180d)
   - APIs: GET /api/badges?userId=, POST /api/badges, GET /api/badges/all, POST /api/admin/badges
   - Displays on web profile, public profiles, and mobile profile

2. **Bug Verification** - All P0/P1 bugs verified fixed:
   - Messenger Widget: New Chat + dark mode working
   - Media uploads: Cloudinary upload functional
   - Bulk List API: JWT auth working for mobile

### Sessions 1-13 (Previously Completed)
- Full auth (Google + Email), card management, social feed, friends, groups/chat
- Messaging with replies & media, marketplace, trade system with ratings
- Deck Builder (import, manual add, community decks, mana curve)
- Push notifications, LiveKit calls, email verification
- Dark mode (web + mobile), onboarding tour, CSV import/export
- Admin group controls, shipping/payment details in trades

---

## KEY API ENDPOINTS

### Badges
- `GET /api/badges?userId=` - Get user badges
- `POST /api/badges` - Auto-check and award badges
- `GET /api/badges/all` - All 26 badge definitions
- `POST /api/admin/badges` - Admin award/remove

### Feed (updated with badges)
- `GET /api/feed?tab=public|friends|groups` - Returns badge_count + top_badge per post

---

## NEXT STEPS

### P1 - High Priority
- Native Expo Build guide (push notifications + video calls require it)
- Google Play Store deployment guide

### P2 - Medium Priority
- Referralsystem
- Premium features/subscription
- Offlineläge (mobil)

### P3 - Future
- Video-samtal på mobil (kräver native build)

### Skipped (per user request)
- ~~Event Calendar/Tournaments~~
- ~~Price Alerts/Push Notifications~~
- ~~Card scanning with camera~~
- ~~Tournament bracket system~~

---

*Last Updated: February 22, 2026*
