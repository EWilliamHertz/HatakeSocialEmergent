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

### Mobile Application (NEW)
- React Native with Expo
- React Navigation (Native Stack + Bottom Tabs)
- Zustand (State Management)
- Axios (API Client)
- Expo SecureStore (Token Storage)
- Expo Camera (Card Scanner)

## Test Credentials
- **Test User**: test@test.com / password (admin)
- **Admin Users**: zudran@gmail.com, ernst@hatake.eu

---

## COMPLETED FEATURES

### Session 2026-02-19 (Latest)

#### Mobile App Development ✅
Complete React Native mobile application with:

1. **Authentication**
   - Email/password login & registration
   - Session persistence with SecureStore
   - Auto-login on app restart

2. **Collection Management**
   - View collection with grid layout
   - Filter by game (MTG/Pokémon)
   - Search within collection
   - Collection stats (total cards, unique, value)
   - Add/remove cards

3. **Card Search**
   - Search MTG via Scryfall API
   - Search Pokémon via TCGdex API
   - Quick-add to collection

4. **Card Scanner**
   - Camera-based card capture
   - Game selection (MTG/Pokémon)
   - Card frame guide overlay
   - Photo library import
   - Match results with quick-add

5. **Marketplace**
   - Browse listings with filters
   - View listing details
   - Seller information
   - Price display with foil badges

6. **Trading System**
   - View trades (all/pending/completed)
   - Trade status badges
   - Trade summary (cards + cash)

7. **Profile**
   - User stats display
   - Menu navigation
   - Logout functionality

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
├── App.tsx                 # Main entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── README.md              # Documentation
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── CardItem.tsx
│   │   ├── GameFilter.tsx
│   │   └── SearchBar.tsx
│   ├── navigation/        # React Navigation config
│   │   └── AppNavigator.tsx
│   ├── screens/           # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── CollectionScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── MarketplaceScreen.tsx
│   │   ├── TradesScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── ScannerScreen.tsx
│   ├── services/          # API services
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── collection.ts
│   │   ├── marketplace.ts
│   │   ├── search.ts
│   │   ├── trades.ts
│   │   └── config.ts
│   └── store/             # Zustand state
│       └── index.ts
```

---

## RUNNING THE MOBILE APP

```bash
# Navigate to mobile directory
cd /app/mobile/hatake-mobile

# Install dependencies (already done)
npm install

# Start Expo development server
npm start

# Or run on specific platform
npm run ios      # iOS Simulator
npm run android  # Android Emulator
```

---

## API CONFIGURATION

The mobile app is pre-configured to use:
```typescript
API_BASE_URL = 'https://deck-builder-69.preview.emergentagent.com'
```

---

## DATABASE SCHEMA

### Tables
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
- Latest: `/app/test_reports/iteration_11.json` - All 23 tests passed

---

## NEXT STEPS

### Mobile App Enhancements
1. **Push Notifications** - Trade updates, messages, price alerts
2. **Card Recognition ML** - Integrate Google Vision or custom model
3. **Offline Mode** - SQLite caching for offline collection viewing
4. **Biometric Auth** - Face ID / Fingerprint login

### Publishing
- Apple Developer Account needed for iOS
- Google Play Developer Account needed for Android
- EAS Build for app distribution

---

*Last Updated: February 19, 2026*
