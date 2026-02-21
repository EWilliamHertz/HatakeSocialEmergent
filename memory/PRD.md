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
- Expo Camera (Card Scanner)

## Test Credentials
- **Test User**: test@test.com / password (admin)
- **Admin Users**: zudran@gmail.com, ernst@hatake.eu

---

## COMPLETED FEATURES

### Session 2026-02-21 (Latest)

#### Mobile App Bug Fixes
1. **Pokemon Card Images Fixed**
   - Fixed `getCardImage` function to handle TCGdex API format
   - TCGdex returns `image` as direct URL string, not `images.large/small`
   - Appends `/high.webp` for high-res images

2. **Marketplace Images Fixed**
   - Same Pokemon image fix applied
   - MTG cards continue to use Scryfall `image_uris` format

3. **Feed Screen Card Images Fixed**
   - Added `getCardImageUrl` helper to handle both MTG and Pokemon formats

4. **Drawer Menu Enhanced**
   - Added Wishlists navigation item
   - Implemented `handleNavigate` with Coming Soon alerts for unimplemented screens
   - Proper navigation handling for bottom tab screens

5. **Auth/Me Bearer Token Support**
   - Fixed `/api/auth/me` to support Bearer token authentication
   - Mobile app can now verify token validity on startup

6. **Web Build Verified**
   - Confirmed `yarn build` passes successfully
   - No blocking build errors

#### Previous Features (Maintained)
- Sealed Product Management (Pokemon + MTG)
- Deck Builder Import/Export (MTGA, Archidekt)
- Deck Builder Playtesting
- Individual card sale pricing (% of market)
- Deck format validation (MTG + Pokemon)
- Wishlists, Trade Reputation

---

## MOBILE APP STRUCTURE

```
/app/mobile/hatake-mobile/
├── App.tsx                 # Main entry point with navigation
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── DrawerMenu.tsx # Hamburger drawer with navigation
│   │   ├── Button.tsx
│   │   ├── CardItem.tsx
│   │   ├── GameFilter.tsx
│   │   └── SearchBar.tsx
│   ├── config.ts          # API URL configuration
│   ├── navigation/        # React Navigation config
│   │   └── AppNavigator.tsx
│   ├── screens/           # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── CollectionScreen.tsx
│   │   ├── FeedScreen.tsx
│   │   ├── MarketplaceScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── ScannerScreen.tsx
│   ├── services/          # API services
│   └── store/             # Zustand state
```

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
- `DELETE /api/collection?id=` - Remove card from collection

### Marketplace
- `GET /api/marketplace` - Get listings (supports Bearer token auth)
- `POST /api/marketplace` - Create listing
- `DELETE /api/marketplace/{id}` - Remove listing

### Feed
- `GET /api/feed` - Get posts (supports Bearer token auth)
- `POST /api/feed` - Create post

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

## DATABASE SCHEMA

### Key Tables
- `users` - User accounts with is_admin flag
- `collection_items` - User card collections
- `marketplace_listings` - Cards for sale (with price_percentage)
- `trades` - Trade offers between users
- `trade_ratings` - Trade reputation system
- `wishlists` - User wishlists
- `wishlist_items` - Cards in wishlists
- `sealed_products` - Sealed product tracking

---

## TEST REPORTS
- Latest: `/app/test_reports/iteration_12.json` - All 13 tests passed
- Mobile app features verified: Login, Collection, Marketplace, Drawer Menu

---

## NEXT STEPS

### Immediate (P0)
- User verification of mobile app functionality on iPad Safari
- Confirm web build deploys to Vercel successfully

### High Priority (P1)
1. **Mobile App Phase 2:**
   - Implement Trades screen
   - Implement Friends screen
   - Implement Wishlists screen
   - Full Deck Builder functionality

2. **Sealed Products:**
   - Integrate PriceCharting API (if user provides subscription)
   - OR build manual entry system for sealed products
   - Add sealed products tab to web Collection page

### Medium Priority (P2)
1. Mobile App real-time messaging
2. Push notifications for trade updates
3. Offline mode with SQLite caching

### Future (P3)
- Card Recognition ML integration
- Biometric authentication
- Apple/Google Play store publishing

---

## KNOWN ISSUES
- Some MTG test cards (CSV import) show placeholder icons due to missing Scryfall image_uris
- Mobile app drawer menu navigation shows "Coming Soon" for unimplemented screens

---

*Last Updated: February 21, 2026*
