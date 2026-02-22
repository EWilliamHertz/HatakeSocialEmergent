# Hatake.Social - TCG Trading Platform PRD

## Original Problem Statement
Create a comprehensive full-stack TCG (Trading Card Game) social platform with card management, marketplace, social features, and trading capabilities. Includes a Next.js web app and React Native (Expo) mobile app.

## Tech Stack

### Web Application
- Next.js 16+ with App Router
- TypeScript, Tailwind CSS
- PostgreSQL (Neon)
- Cloudinary (image storage)
- TCGdex API (Pokemon), Scryfall API (MTG)
- Resend (email notifications)
- LiveKit (video/voice calls)

### Mobile Application
- React Native with Expo
- React Navigation (Native Stack + Bottom Tabs)

## Test Credentials
- **Test User**: test@test.com / password (admin)

---

## COMPLETED FEATURES

### Session 14 - Badge System & Bug Verification (2026-02-22)

1. **Comprehensive Badge System** - 26 badge types across 7 categories
   - **Trading:** First Trade, Active (5), Experienced (10), Pro (25), Master (50), Top (100), Legendary (250)
   - **Collection:** Starter (10+), Collector (50+), Serious (100+), Hoarder (500+), Vault Keeper (1000+)
   - **Social:** Social Butterfly (10+ friends), Community Leader (5+ groups), Content Creator (20+ posts)
   - **Marketplace:** First Listing, Merchant (20+ listings)
   - **Deck Building:** Deck Builder (1+ deck), Deck Master (10+ decks)
   - **Reputation:** Verified Seller, Five Star
   - **Special (manual):** Beta Tester, Founder, Moderator
   - **Account Age:** Veteran (30+ days), OG Member (180+ days)
   - Auto-award on profile visit, admin manual award support
   - Display on web profile (own + public), mobile profile
   - API: GET /api/badges?userId=, POST /api/badges (auto-check), GET /api/badges/all

2. **Bug Verification Results**
   - Web Messenger Widget: New Chat works - loads user list, search, start conversation
   - Web Messenger Widget: Dark mode properly themed (dark bg, not white)
   - Upload API: Working with Cloudinary (image + video)
   - Bulk List API: Working with JWT auth for mobile compatibility

3. **Mobile Bulk Listing Styles** - Added all missing StyleSheet entries for bulk list modal

4. **Mobile Profile Badges** - Added badge display with grid layout, colors, icons

### Previously Completed (Sessions 1-13)
- Authentication (Google + Email/Password)
- Card search & collection management (MTG + Pokemon)
- CSV import/export
- Social feed with posts, likes, comments, reactions
- Friends system
- Groups/Communities with chat
- Real-time messaging with replies, media uploads
- Marketplace listings (buy/sell)
- Trade system with ratings & reputation
- Deck Builder (import, manual add, community decks)
- Push notifications (Expo)
- LiveKit video/audio calls
- Email verification & notifications
- Dark mode (web + mobile)
- Onboarding tour for new users
- Shipping & payment details in trades
- Admin group controls (delete posts, edit settings)

---

## KEY API ENDPOINTS

### Badges
- `GET /api/badges?userId=` - Get user badges
- `POST /api/badges` - Auto-check and award badges (requires auth)
- `GET /api/badges/all` - Get all 26 badge definitions
- `POST /api/admin/badges` - Admin award/remove badges

### Collection
- `POST /api/collection/bulk-list` - Bulk list cards for sale (JWT + session auth)

### Messages
- `GET /api/messages` - Get conversations
- `POST /api/messages` - Send message / create conversation
- `GET /api/messages/{conversationId}` - Get messages

### Upload
- `POST /api/upload` - Upload image/video to Cloudinary

---

## DATABASE SCHEMA ADDITIONS

### user_badges table
```sql
CREATE TABLE user_badges (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
  badge_type VARCHAR(100) NOT NULL,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  awarded_by VARCHAR(255),
  UNIQUE(user_id, badge_type)
);
```

---

## NEXT STEPS

### P0 - Immediate
- None currently blocked

### P1 - High Priority
- Mobile Deck Builder: Connect UI stubs to backend logic
- Complete Deck Builder playtesting and format validation

### P2 - Medium Priority  
- Deck Statistics/Analytics
- Native Expo Build for push notifications + video calls
- Google Play Store deployment guide

### P3 - Future/Backlog
- Video calls on mobile (requires native build)
- Card price tracking/alerts
- Tournament bracket system
- Card scanning with camera
- Offline mode (mobile)
- Referral system
- Premium features/subscription

### Skipped (per user request)
- Event Calendar/Tournaments
- Price Alerts/Push Notifications

---

*Last Updated: February 22, 2026*
