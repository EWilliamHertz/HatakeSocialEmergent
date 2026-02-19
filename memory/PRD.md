# Hatake.Social - TCG Trading Platform PRD

## Original Problem Statement
Create a comprehensive full-stack TCG (Trading Card Game) social platform with card management, marketplace, social features, and trading capabilities.

## Tech Stack
- Next.js 16+ with App Router
- TypeScript, Tailwind CSS, shadcn/ui
- PostgreSQL (Neon)
- LiveKit (video calls)
- Cloudinary (image storage)
- TCGdex API (Pokemon), Scryfall API (MTG)

## Test Credentials
- **Test User**: test@test.com / password (admin)
- **Admin Users**: zudran@gmail.com, ernst@hatake.eu, ewilliamhe@gmail.com

## Environment Variables (Production)
```
# LiveKit (for video calls)
LIVEKIT_URL=wss://hatakesocial-abnya21v.livekit.cloud
LIVEKIT_API_KEY=APIcmewPUZxefyQ
LIVEKIT_API_SECRET=hG8vVeRevgA42fJcpKcC8YqduOYJNff3VHPfewA5H9QK
NEXT_PUBLIC_LIVEKIT_URL=wss://hatakesocial-abnya21v.livekit.cloud

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=dfyh7cs1g
CLOUDINARY_API_KEY=734447488263944
CLOUDINARY_API_SECRET=fQgKFWGt0aw8kl8WgBN2z14RX-c
```

---

## COMPLETED FEATURES (Verified Working)

### Session 2026-02-19

1. **Database Migration Executed** ✅
   - Created `wishlists`, `wishlist_items`, `trade_ratings` tables
   - Added indexes for performance

2. **Wishlists Feature** ✅
   - Create public/private wishlists
   - View all wishlists (My Wishlists / Public Wishlists tabs)
   - Delete wishlists
   - Add items to wishlists (API ready)
   - UI at `/wishlists`

3. **Trade Reputation System** ✅
   - Rate trades (1-5 stars) with comments
   - TradeRating component integrated into completed trade pages
   - UserReputation component shows on user profiles
   - API: POST/GET `/api/trades/ratings`

4. **Marketplace Delete** ✅
   - Owners can delete their own listings
   - Admins can delete any listing
   - UI shows delete button on hover

5. **LiveKit Video Calls** ✅ (User confirmed)
6. **Cloudinary Image Upload** ✅ (User confirmed)
7. **CSV Import** ✅
   - Supports ManaBox (MTG) and Pokemon formats
   - Preview before import
   - Set code mapping for Pokemon

### Previous Sessions
- Deck Analytics (mana curve, colors, types, legality, playtesting, export)
- Collection Statistics (rarity, game, condition distribution, CSV export)
- Enhanced CSV imports (Pokemon & MTG)
- Mobile responsive landing page
- Friends system
- Groups/Communities with chat
- Real-time messaging

---

## IN PROGRESS / NEEDS VERIFICATION

None currently - all reported bugs fixed and verified.

---

## UPCOMING TASKS (P1)

1. **Deck Builder: Import/Export**
   - Support MTGA format
   - Support Archidekt format
   - Export to popular formats

2. **Deck Builder: Playtesting**
   - Draw sample hands
   - Goldfish mode

3. **Individual Card Sale Pricing**
   - Set sale prices as % of market value per card
   - Override individual card prices in bulk listing

---

## FUTURE TASKS (P2+)

1. **Deck Builder: Format Validation**
   - Standard, Modern, Commander legality checks

2. **Collection: Find Duplicates**
   - Identify duplicate cards for trading/selling

3. **Sealed Product Management**
   - Track boxes, boosters, etc.

4. **Admin Panel: Analytics Tab**
   - Site usage statistics
   - User engagement metrics

5. **Mobile App**
   - Design and roadmap
   - Native app development

---

## DATABASE SCHEMA (Key Tables)

### New Tables (2026-02-19)
```sql
-- Wishlists
wishlists (wishlist_id, user_id, name, description, is_public, created_at, updated_at)
wishlist_items (item_id, wishlist_id, card_id, card_data, game, quantity, priority, notes, created_at)
trade_ratings (rating_id, trade_id, rater_id, rated_user_id, rating, comment, created_at)
```

### Existing Tables
- users (with is_admin flag)
- collection_items
- marketplace_listings
- trades
- friendships
- groups, group_members
- conversations, messages
- posts, comments, likes
- notifications

---

## KEY API ENDPOINTS

### Wishlists
- GET `/api/wishlists` - List user's wishlists
- GET `/api/wishlists?public=true` - List public wishlists
- POST `/api/wishlists` - Create wishlist
- GET `/api/wishlists/[id]` - Get wishlist with items
- PUT `/api/wishlists/[id]` - Update wishlist
- DELETE `/api/wishlists/[id]` - Delete wishlist
- POST `/api/wishlists/[id]` - Add item to wishlist

### Trade Ratings
- POST `/api/trades/ratings` - Submit rating for completed trade
- GET `/api/trades/ratings?userId=X` - Get user's ratings and stats

### Marketplace
- DELETE `/api/marketplace/[listingId]` - Delete listing (owner/admin)

### Collection
- POST `/api/collection/import` - Import cards from CSV

---

## TEST REPORTS
- Latest: `/app/test_reports/iteration_10.json` - All 17 tests passed
