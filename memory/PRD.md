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
- Personal collection management with manual add and CSV import
- **Supported CSV formats:** ManaBox (MTG), Pokemon export_2026
- Collection value calculation with multi-currency support (EUR, USD, SEK)
- Support for card conditions, finish variants (Holofoil, Reverse Holofoil, etc.)
- Graded card tracking (PSA, BGS, CGC, SGC)

### Social Features  
- Social Feed with posts, comments, nested replies
- Emoji reactions on posts and comments
- **Community page** - Combined Friends + Groups with tabs
- User profiles with stats

### Search
- **Universal search** - Cards, Users, Posts, Decks all in one place
- Game filter (All, Pokemon, MTG) for card results
- Users/Posts/Decks always displayed when searching

### Messaging & Calls
- Real-time messaging via MessengerWidget
- WebRTC voice/video calls with incoming call notifications
- Proper JSON error handling for API responses

### Commerce
- Marketplace for buying/selling cards
- Trade creation system
- Shop page for official merchandise

### Admin Panel
- Shop Inventory management (CRUD for products)
- Analytics dashboard with site statistics
- User management with Make Admin/Remove Admin
- Post moderation with Delete Post capability

### Navigation & Settings
- Avatar dropdown menu with Profile, Settings, Admin Panel (for admins), Logout
- Settings page with Profile, Password, Notifications, Privacy sections
- Cleaner navbar with reduced icons

### Performance
- **Server-side API caching** for Scryfall and TCGdex API calls
- Cache stored in PostgreSQL `api_cache` table with TTL

## Tech Stack
- **Framework:** Next.js 15+ with App Router
- **Database:** PostgreSQL (Neon)
- **Styling:** Tailwind CSS, shadcn/ui
- **Card APIs:** Scryfall (MTG), TCGdex (Pokemon)
- **Auth:** Emergent-managed Google OAuth, JWT sessions

## What's Been Implemented

### February 17, 2026 - Session 4 (Latest)

**Bug Fixes:**
1. ✅ **Video calls - "No peer connection" error** - Fixed by assigning `peerConnectionRef.current` immediately in `createPeerConnection()` instead of only returning it
2. ✅ **CSV import fails after preview** - Fixed by including proper headers when reconstructing CSV from parsed cards
3. ✅ **CSV import currency showing $** - Now displays original currency from CSV (EUR/SEK/USD)
4. ✅ **MTG search showing Pokemon results** - Fixed search API game filter to properly segregate results
5. ✅ **Messenger JSON parse errors** - Added proper try/catch with text-first parsing to handle non-JSON responses

**New Features:**
- **Search includes Users/Posts/Decks** - Search API and UI updated to display all entity types
- **Community Page** - Combined Friends+Groups with tabs
- **Settings Page** - Profile, Password, Notifications, Privacy settings
- **Avatar Dropdown Menu** - Profile, Settings, Admin Panel, Logout
- **Admin Tools** - Make/Remove Admin buttons, Delete Post functionality
- **Pokemon CSV format** - Support for export_2026 format
- **Server-side API caching** - PostgreSQL-backed cache

**Testing:** 20/20 backend tests passed (iteration_5.json)

## Key API Endpoints
- `/api/collection/import` - CSV import (ManaBox + Pokemon formats)
- `/api/cards/mtg` - MTG search proxy with caching
- `/api/search?type=all` - Universal search (cards, users, posts, decks)
- `/api/calls?mode=preview|active` - WebRTC signaling

## Key Files
- `/app/components/VideoCall.tsx` - **Line 205**: `peerConnectionRef.current = pc;`
- `/app/components/MessengerWidget.tsx` - **Lines 145-155, 200-213**: JSON error handling
- `/app/app/api/search/route.ts` - Universal search with game filter
- `/app/app/api/collection/import/route.ts` - Multi-format CSV import

## Known Issues (Updated Status)
1. ✅ **Video calls "No peer connection"** - Fixed (code reviewed)
2. ✅ **CSV import fails** - Fixed and tested
3. ✅ **CSV currency display** - Fixed
4. ✅ **MTG/Pokemon search mixing** - Fixed
5. ✅ **Messenger JSON errors** - Fixed (code reviewed)
6. 🔧 **Video calls real-world test** - Needs two-user testing

## Test Accounts
- **Regular:** test@test.com / password
- **Admin:** zudran@gmail.com, ernst@hatake.eu

## Upcoming Tasks
1. Real-world two-user video call test (P1)

## Future Backlog
- Payment gateway integration (Stripe)
- Card deck sharing functionality
- Find duplicates feature in collection
- Sealed product management
