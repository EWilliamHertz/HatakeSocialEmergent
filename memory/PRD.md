# TCG Hub - Trading Card Game Social Platform

## Original Problem Statement
Build a full-stack TCG (Trading Card Game) social platform similar to hatake.social, with card search, collection management, marketplace, trading, and social features.

## What's Been Implemented

### Core Features
1. **Card Search** (Working - MTG via Scryfall)
   - Advanced search with Set Code and Collector Number filters
   - Grid/List view toggle
   - Game selection (Pokemon, MTG)
   - Note: Pokemon TCG API times out from this cloud environment

2. **Collection Management** (Implemented)
   - View cards in collection
   - Add/remove cards
   - Edit card details (quantity, condition, foil)
   - Bulk actions: Select All, Bulk Delete, Bulk List for Sale
   - Filter by game type
   - Search within collection

3. **Marketplace** (Implemented)
   - Browse listings
   - Advanced filters (price range, condition, foil only)
   - Sort by newest, price
   - Contact seller (starts conversation)
   - Create listings from collection

4. **Trading System** (Implemented)
   - View active/completed trades
   - Accept/reject trade requests
   - Trade detail view

5. **Social Features**
   - **Feed**: Posts with Friends/Groups/Public tabs
   - **Friends**: Friends list, friend requests, search users
   - **Messaging**: Conversations, send messages, start new conversations
   - **Messenger Widget**: Floating chat popup on all pages

6. **User Profile** (Implemented)
   - Edit profile (name, bio)
   - Stats display (cards, listings, friends, trades)
   - Quick actions

7. **Authentication**
   - Email/Password signup/login
   - Google OAuth (integrated)
   - Session management with JWT

### Navigation
Full navbar with:
- Feed, Search, Collection, Marketplace, Trades, Friends, Messages
- Profile link and notifications
- Mobile responsive menu

### API Endpoints Created
- `/api/auth/*` - Authentication
- `/api/search` - Card search with set/number filters
- `/api/collection/*` - Collection CRUD + bulk actions
- `/api/marketplace` - Listings
- `/api/trades/*` - Trading system
- `/api/friends/*` - Friends system
- `/api/messages/*` - Messaging
- `/api/profile/*` - User profile
- `/api/users/search` - User search

## Current Status

### Working
- All frontend pages and components
- MTG card search via Scryfall API
- All API endpoints (tested locally)
- Database schema and queries

### Known Issues
1. **Pokemon TCG API**: Times out from cloud environment (504 error)
2. **Preview URL**: External preview shows "Unavailable" - platform routing issue
   - Server runs correctly on localhost:3000
   - All APIs respond correctly via curl

### Database
Using PostgreSQL (Neon) - requires migration to MongoDB for Emergent deployment

## Tech Stack
- **Framework**: Next.js 16.1.6 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Neon)
- **Auth**: JWT + Google OAuth

## Files Structure
```
/app
├── app/
│   ├── api/           # API routes
│   ├── auth/          # Auth pages
│   ├── collection/    # Collection page
│   ├── feed/          # Social feed
│   ├── friends/       # Friends page
│   ├── marketplace/   # Marketplace
│   ├── messages/      # Messaging
│   ├── profile/       # User profile
│   ├── search/        # Card search
│   └── trades/        # Trading
├── components/        # React components
├── lib/              # Utilities (auth, db, config)
└── db/               # SQL schema
```

## Next Steps (Priority Order)

### P0 - Critical
1. Fix Pokemon TCG API connectivity or implement fallback
2. Resolve preview URL routing issue

### P1 - High Priority
3. Google login flow verification
4. Card variation modal (foil, condition, quantity selector)
5. Complete trade creation flow

### P2 - Medium Priority
6. Notifications system
7. Groups/Communities
8. Deck building feature

### P3 - Future
9. Voice/Video calls (WebRTC)
10. Mobile app (React Native/Expo)

## Credentials
- Pokemon TCG API Key: In .env.local
- Database: Neon PostgreSQL connection string in .env.local
