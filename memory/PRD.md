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
- Expo SecureStore (Token Storage)

## Test Credentials
- **Test User**: test@test.com / password (admin)
- **Admin Users**: zudran@gmail.com, ernst@hatake.eu

---

## COMPLETED FEATURES

### Session 2026-02-21 - Bug Fixes

#### Web App Fixes
1. **Navbar Simplified** - Removed Sealed and Wishlists icons from header (accessible via Collection page tabs)
2. **Sealed Price Input Fixed** - Leading zero bug fixed with onFocus handler
3. **CSV Import Uncapped** - Full CSV now stored and used for import (supports 151+ cards)
4. **Messenger Scroll Fixed** - Added scroll position tracking to prevent auto-scroll when reading old messages

#### Mobile App Fixes
1. **Feed Username Display** - Fixed Post interface to use correct API field names (name/picture)
2. **Pokemon Set Code Translation** - Added POKEMON_SET_ALIASES mapping (sv09→jtg, etc.)
3. **Search Results Increased** - Limit raised from 30 to 50 results
4. **Pokemon Prices Added** - getCardPrice helper extracts cardmarket/tcgplayer prices
5. **Collection Value Stats** - Added total value, MTG value, Pokemon value display
6. **MTG Search Working** - Scryfall API search confirmed functional

### Previous Features (Maintained)
- Sealed Product Management (Pokemon + MTG)
- Deck Builder Import/Export (MTGA, Archidekt)
- Deck Builder Playtesting
- Individual card sale pricing (% of market)
- Deck format validation (MTG + Pokemon)
- Wishlists, Trade Reputation

---

## KEY API ENDPOINTS

### Authentication
- `POST /api/auth/login` - Login with email/password, returns JWT token
- `POST /api/auth/signup` - Register new user
- `GET /api/auth/me` - Get current user (supports Bearer token + cookie)
- `POST /api/auth/logout` - Logout user

### Collection
- `GET /api/collection` - Get user's card collection (Bearer token auth)
- `POST /api/collection` - Add card to collection
- `POST /api/collection/import` - CSV import (preview/import actions)
- `DELETE /api/collection?id=` - Remove card from collection

### Marketplace
- `GET /api/marketplace` - Get listings (supports Bearer token auth)
- `POST /api/marketplace` - Create listing
- `DELETE /api/marketplace/{id}` - Remove listing

### Feed
- `GET /api/feed` - Get posts (supports Bearer token auth)
- `POST /api/feed` - Create post

### Sealed Products
- `GET /api/sealed` - Get user's sealed products
- `POST /api/sealed` - Add sealed product
- `PATCH /api/sealed/{id}` - Update sealed product
- `DELETE /api/sealed/{id}` - Remove sealed product

---

## SEALED TCG PRODUCT OPTIONS

### API Options Researched
| Provider | Access | Features |
|----------|--------|----------|
| **PriceCharting API** | Paid (Legendary subscription) | Sealed TCG prices by ID/UPC/ASIN, demo token available |
| **TCGplayer** | Partner access required | Extensive database, requires partnership |
| **Manual Entry** | Free | Custom database with user-entered data |

### Recommendation
Use PriceCharting API for pricing data (paid subscription required), or implement a manual entry system for sealed products.

---

## TEST REPORTS
- Latest: `/app/test_reports/iteration_13.json` - All 10 bugs verified fixed
- Previous: `/app/test_reports/iteration_12.json` - Mobile app features verified

---

## NEXT STEPS

### User Verification Needed
- Test Messenger widget scroll behavior (can now scroll up to read old messages)
- Test CSV import with 151+ card file
- Test mobile app feed shows usernames correctly
- Test mobile Pokemon search with sv09 set code

### High Priority (P1)
1. **Mobile App Phase 2:**
   - Implement Trades screen
   - Implement Friends screen
   - Implement Wishlists screen

2. **Sealed Products:**
   - Integrate PriceCharting API (if user provides subscription)
   - OR enhance manual entry system

### Medium Priority (P2)
1. Mobile App real-time messaging
2. Push notifications for trade updates
3. Offline mode with SQLite caching

### Future (P3)
- Card Recognition ML integration
- Apple/Google Play store publishing

---

## KNOWN ISSUES
- Mobile app TypeScript has pre-existing type errors (don't affect runtime)
- Some MTG test cards (CSV import) show placeholder icons due to missing Scryfall image_uris

---

*Last Updated: February 21, 2026*
