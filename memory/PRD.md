# Hatake.Social - Product Requirements Document

## Overview
Hatake.Social is a full-stack TCG (Trading Card Game) social platform built with Next.js 15+ and PostgreSQL.

## Core Features

### Authentication
- Email/Password signup and login
- Google Sign-In (Emergent-managed OAuth)
- Session-based authentication with HTTP-only cookies

### Card Management
- Search cards from Scryfall (MTG) and TCGdex (Pokemon)
- Personal collection management with manual add and CSV import (ManaBox format)
- **JTG/official set code aliases** supported (JTG -> sv09, etc.)
- Collection value calculation with multi-currency support (EUR + USD)
- Support for card conditions, finish variants (Holofoil, Reverse Holofoil, etc.)
- Graded card tracking (PSA, BGS, CGC, SGC)
- Custom card image uploads and signed card tracking

### Social Features
- Social Feed with posts, comments, nested replies
- Emoji reactions on posts and comments
- Friends system with friend requests
- Groups/Communities with group chat and member invites
- User profiles with stats

### Messaging & Calls
- Real-time messaging via MessengerWidget
- WebRTC voice/video calls with incoming call notifications
- In-app notifications

### Commerce
- Marketplace for buying/selling cards
- Trade creation system
- Shop page for official merchandise
- Admin panel for shop inventory management

### Admin Panel
- Shop Inventory management (CRUD for products)
- Analytics dashboard with site statistics
- User management with search and deletion
- Platform settings

## Tech Stack
- **Framework:** Next.js 15+ with App Router
- **Database:** PostgreSQL (Neon)
- **Styling:** Tailwind CSS, shadcn/ui
- **Card APIs:** Scryfall (MTG), TCGdex (Pokemon with Cardmarket pricing)
- **Auth:** Emergent-managed Google OAuth, JWT sessions

## What's Been Implemented

### February 17, 2026 - Session 4 (Current)
**Bug Fixes:**
- **CSV Import:** Rewrote `/api/collection/import` with extensive logging. Now properly stores card_data with Scryfall enrichment (names, images, prices)
- **MTG Search:** Created backend proxy `/api/cards/mtg` to avoid client-side CORS issues in production
- **Dark Mode:** Added `dark:` classes to Collection, Marketplace, Friends, Trades pages
- **Video Calls:** Fixed incoming call state management - added `activeCallData` to preserve caller info. Added `request_offer` signal for retry mechanism

**Technical Changes:**
- Collection page now uses `/api/cards/mtg` proxy instead of direct Scryfall calls
- MessengerWidget properly preserves incoming call data when accepting
- VideoCall component has retry mechanism if offer not received within 5s

### February 17, 2026 - Session 3
**Bug Fixes & Features:**
- Fixed MTG card search (was timing out, added AbortController)
- Fixed "Missing required fields" error when adding Pokemon cards
- Fixed JTG + 24 search (Journey Together set code alias sv09)
- Added price display in search results modal (green badges)
- Fixed multi-currency support (EUR € for Pokemon, USD $ for MTG)
- Created enhanced "Add to Collection" modal with quantity, finish, condition, graded options
- Fixed collection page display showing correct currency per card type
- Fixed admin panel stats (using correct table names)

### Previous Sessions
- Social Feed with comments, replies, emoji reactions
- Video call rework with incoming call notifications
- About Us and Shop pages
- Admin panel with shop inventory management
- Replaced Pokemon TCG SDK with TCGdex API
- Card search by name feature

## Known Issues (Updated Status)
1. ✅ **CSV Import broken in production** - Fixed with Scryfall enrichment and logging
2. 🔧 **Video calls unstable** - Improved with activeCallData fix and request_offer retry
3. ✅ **MTG Search CORS** - Fixed with backend proxy
4. ✅ **Dark Mode inconsistent** - Fixed on Collection, Marketplace, Friends, Trades pages
5. ⏳ **Pokemon search prices** - Prices show in modal but not in initial list (needs API call per card)
6. ⏳ **API usage concerns** - Recommend server-side caching (not yet implemented)

## Upcoming Tasks
1. Complete Admin Panel (Analytics, Users, Settings tabs fully functional) (P1)
2. Advanced marketplace filters (P1)
3. Server-side API caching for Scryfall/TCGdex (P2)
4. Pokemon search prices in initial results (P2)

## Future Backlog
- Payment gateway integration for Shop (Stripe recommended)
- Card deck sharing functionality
- Find duplicates feature in collection
- Sealed product management
- Mobile Android application

## Admin Accounts
- zudran@gmail.com
- ernst@hatake.eu

## Test Account
- test@test.com / password

## API Integrations
- **Scryfall:** Magic: The Gathering card data with USD/EUR pricing
- **TCGdex:** Pokemon TCG card data with Cardmarket (EUR) pricing
- **Emergent Google Auth:** User sign-in

## Key API Endpoints
- `/api/collection/import` - CSV import (ManaBox format)
- `/api/cards/mtg` - MTG search proxy (avoids CORS)
- `/api/collection` - Collection CRUD
- `/api/calls` - WebRTC signaling

## Key Files
- `/app/app/collection/page.tsx` - Main collection page (needs refactoring - 2000+ lines)
- `/app/app/api/collection/import/route.ts` - CSV import with Scryfall enrichment
- `/app/app/api/cards/mtg/route.ts` - MTG search proxy
- `/app/components/VideoCall.tsx` - Video call component
- `/app/components/MessengerWidget.tsx` - Messenger with call handling
