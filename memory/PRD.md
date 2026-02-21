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

## COMPLETED FEATURES - Session 2026-02-21

### Latest Fixes & Features

1. **MTG Search with Edition Picker** ✅
   - Created `/api/scryfall` backend proxy to fix iOS network issues
   - Fetches up to 3 pages (~175 cards) from Scryfall
   - Groups cards by name, shows edition picker
   - Horizontal scrollable chips to select set/edition
   - Shows price for each edition

2. **Feed Emoji Reactions Layout** ✅
   - Fixed vertical stacking issue
   - Reactions now display horizontally with proper styling

3. **Mobile Bulk Selection & Delete** ✅
   - Long-press a card to enter selection mode
   - Checkboxes appear on all cards
   - "Select All" and "Clear" buttons
   - Floating delete bar at bottom
   - Confirmation before bulk delete

4. **Profile Screen** ✅
   - Already implemented with:
     - User avatar and info
     - Settings, Notifications, Privacy menu items
     - Help Center, Terms of Service
     - App version info
     - Sign Out button

### Previous Session Completions
- Euro currency conversion
- Pokemon search improvements
- Collection value stats
- Shop tab on marketplace
- Multi-image upload in admin panel
- Single card delete fix
- Feed like/emoji reactions

---

## KEY API ENDPOINTS

### Collection Management
- `GET /api/collection` - Get user's collection
- `POST /api/collection` - Add card
- `PATCH /api/collection` - Update card
- `DELETE /api/collection?id={id}` - Delete card

### Feed & Social
- `GET /api/feed` - Get posts with reactions
- `POST /api/feed` - Create post
- `POST /api/feed/{postId}/like` - Toggle like
- `POST /api/feed/{postId}/reactions` - Emoji reaction

### Scryfall Proxy (NEW)
- `GET /api/scryfall?q={query}` - Search MTG cards
- `GET /api/scryfall?set={code}&cn={num}` - Direct lookup

---

## MOBILE APP FEATURES STATUS

| Feature | Status |
|---------|--------|
| Authentication | ✅ Complete |
| Collection View | ✅ Complete |
| Add Pokemon Cards | ✅ Complete |
| Add MTG Cards | ✅ Complete (with edition picker) |
| Single Card Delete | ✅ Complete |
| Bulk Card Delete | ✅ Complete |
| Card Detail Modal | ✅ Complete |
| Feed View | ✅ Complete |
| Like Posts | ✅ Complete |
| Emoji Reactions | ✅ Complete |
| Comments | ⏳ Placeholder only |
| Marketplace View | ✅ Complete |
| Profile Screen | ✅ Complete |
| Settings Page | ⏳ Placeholder |

---

## NEXT STEPS

### High Priority (P1)
1. **Comments System:**
   - View comments on posts
   - Add new comments
   - Reply to comments

2. **Marketplace Features:**
   - Delete own listings
   - Create new listings from collection

### Medium Priority (P2)
1. Search results pagination
2. Friends system & messaging
3. Trading functionality
4. Push notifications

### Future (P3)
- Deck Builder
- Card Recognition ML
- App store publishing

---

## KNOWN BEHAVIORS

1. **Cards without prices** - Show "N/A" (cards added before price tracking)
2. **Shop products without images** - Show package placeholder
3. **Comments** - Currently show "Coming soon" placeholder

---

*Last Updated: February 21, 2026*
