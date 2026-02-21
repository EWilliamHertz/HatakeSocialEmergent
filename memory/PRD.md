# Hatake.Social - TCG Trading Platform PRD

## Original Problem Statement
Create a comprehensive full-stack TCG (Trading Card Game) social platform with card management, marketplace, social features, and trading capabilities.

## Tech Stack

### Web Application
- Next.js 16+ with App Router
- TypeScript, Tailwind CSS, shadcn/ui
- PostgreSQL (Neon)
- LiveKit (video calls)
- Cloudinary (image storage)
- TCGdex API (Pokemon), Scryfall API (MTG)

### Mobile Application
- React Native with Expo
- React Navigation (Native Stack + Bottom Tabs)
- Zustand (State Management)
- Native fetch (API Client)

## Test Credentials
- **Test User**: test@test.com / password (admin)

---

## COMPLETED FEATURES - Session 2026-02-21 (Latest)

### Bug Fixes Verified (All Tests Passed)

1. **Mobile Collection Delete** - Fixed platform-specific confirmation dialogs
   - Uses `window.confirm()` on web for immediate response
   - Uses `Alert.alert()` on native for native dialogs
   - DELETE /api/collection?id={id} working with Bearer token

2. **Mobile MTG Search** - Fixed partial name matching
   - Removed `name:` prefix from Scryfall queries
   - Uses full-text search for better partial matching
   - Both name search and set+collector number lookup work

3. **Mobile Feed Interactions** - Like, comment, emoji features implemented
   - Like toggle: POST /api/feed/{postId}/like with Bearer token
   - Emoji reactions: POST /api/feed/{postId}/reactions with emoji body
   - Feed API now returns reactions array for each post

4. **Price Display** - Search results show prices for both MTG and Pokemon
   - Removed MTG-only filter for price display
   - All prices in EUR format

### Previous Session Completions
- Euro currency conversion across all platforms
- Pokemon search improvements with set code mapping
- Collection value stats display
- Shop tab on marketplace with product gallery
- Multi-image upload in admin panel

---

## KEY API ENDPOINTS

### Collection Management
- `GET /api/collection` - Get user's collection (supports Bearer token)
- `POST /api/collection` - Add card to collection
- `PATCH /api/collection` - Update card details
- `DELETE /api/collection?id={id}` - Delete single card

### Feed & Social
- `GET /api/feed` - Get posts with reactions array
- `POST /api/feed` - Create new post
- `POST /api/feed/{postId}/like` - Toggle like
- `POST /api/feed/{postId}/reactions` - Add/remove emoji reaction

### Shop Products
- `GET /api/shop` - Get active shop products (includes gallery_images)
- `POST /api/admin/products` - Create/update product (admin only)

---

## KNOWN BEHAVIORS (Not Bugs)

1. **Shop Products without images** - Show Package placeholder icon (expected)
2. **Cards without price data** - Show "N/A" for cards added before price tracking
3. **Comments** - Currently show "Coming soon" placeholder (P2 feature)

---

## NEXT STEPS

### High Priority (P1)
1. **Mobile App Phase 2:**
   - Implement full comments system (view, reply, create)
   - Implement Trades screen
   - Implement Friends screen

2. **Mobile Bulk Actions:**
   - Multi-select mode for collection
   - Bulk delete functionality
   - Bulk list for sale

### Medium Priority (P2)
1. Search results pagination
2. Delete own marketplace listings (mobile)
3. Profile & Settings pages (mobile)
4. Mobile real-time messaging

### Future (P3)
- Deck Builder playtesting
- Push notifications
- Card Recognition ML
- App store publishing

---

## TEST REPORTS
- Latest: `/app/test_reports/iteration_14.json` - All 7 bugs verified fixed
- Backend: 100% (17/17 tests passed)
- Frontend: 100% verified

---

*Last Updated: February 21, 2026*
