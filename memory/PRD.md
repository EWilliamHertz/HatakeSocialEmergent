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
- **JTG/official set code aliases** supported (JTG -> sv09, etc.)
- Collection value calculation with multi-currency support (EUR, USD, SEK)
- Support for card conditions, finish variants (Holofoil, Reverse Holofoil, etc.)
- Graded card tracking (PSA, BGS, CGC, SGC)
- Custom card image uploads and signed card tracking

### Social Features  
- Social Feed with posts, comments, nested replies
- Emoji reactions on posts and comments
- **Community page** - Combined Friends + Groups with tabs (Friends, Groups, Requests, Find)
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
- **User management** with Make Admin/Remove Admin functionality
- **Post moderation** with Delete Post capability
- Platform settings

### Navigation & Settings
- **Avatar dropdown menu** with Profile, Settings, Admin Panel (for admins), Logout
- **Settings page** with Profile, Password, Notifications, Privacy sections
- Cleaner navbar with reduced icons (Community combines Friends+Groups)

### Performance
- **Server-side API caching** for Scryfall and TCGdex API calls
- Cache stored in PostgreSQL `api_cache` table with TTL
- 24-hour cache for individual cards, 1-hour for search results

## Tech Stack
- **Framework:** Next.js 15+ with App Router
- **Database:** PostgreSQL (Neon)
- **Styling:** Tailwind CSS, shadcn/ui
- **Card APIs:** Scryfall (MTG), TCGdex (Pokemon with Cardmarket pricing)
- **Auth:** Emergent-managed Google OAuth, JWT sessions

## What's Been Implemented

### February 17, 2026 - Session 4 (Current)
**New Features:**
- **Community Page** - Combined Friends+Groups with tabs (Friends, Groups, Requests, Find)
- **Settings Page** - Profile, Change Password, Notifications, Privacy, Delete Account
- **Avatar Dropdown Menu** - My Profile, Settings, Admin Panel (for admins), Sign Out
- **Admin Tools** - Make Admin/Remove Admin buttons, Delete Post buttons
- **Server-side API Caching** - PostgreSQL-backed cache for Scryfall/TCGdex

**Bug Fixes:**
- **CSV Import currency** - Now displays original currency from CSV (EUR/SEK), not hardcoded $
- **Pokemon CSV format** - Added support for export_2026 format with different headers
- **Enter key search** - Both Pokemon and MTG search fields now support Enter to submit
- **MTG Search CORS** - Backend proxy `/api/cards/mtg` avoids client-side issues
- **Video calls signaling** - Added preview/active polling modes to preserve offers
- **Dark Mode** - Applied to Collection, Marketplace, Friends, Trades pages

**Testing:** 14/14 tests passed (iteration_4.json)

### Previous Sessions
- Social Feed with comments, replies, emoji reactions
- Video call rework with incoming call notifications  
- About Us and Shop pages
- Admin panel with shop inventory management
- Card search with prices, multi-currency, enhanced Add Card modal

## Known Issues (Updated Status)
1. ✅ **CSV Import broken in production** - Fixed with caching and format detection
2. 🔧 **Video calls** - Improved signaling, needs real-world 2-user testing
3. ✅ **MTG Search CORS** - Fixed with backend proxy + caching
4. ✅ **Dark Mode** - Fixed on main pages
5. ⏳ **Pokemon search prices** - Prices show in modal (OK per user)
6. ✅ **API caching** - Implemented with PostgreSQL

## Key API Endpoints
- `/api/collection/import` - CSV import (ManaBox + Pokemon formats)
- `/api/cards/mtg` - MTG search proxy with caching
- `/api/calls?mode=preview|active` - WebRTC signaling
- `/api/admin/users` - User management (GET, PUT for admin toggle, DELETE)
- `/api/admin/posts` - Post moderation (DELETE)

## Key Files
- `/app/app/community/page.tsx` - Combined Friends+Groups page
- `/app/app/settings/page.tsx` - User settings
- `/app/components/Navbar.tsx` - Navigation with avatar dropdown
- `/app/lib/api-cache.ts` - Server-side caching layer
- `/app/app/api/collection/import/route.ts` - Multi-format CSV import

## Admin Accounts
- zudran@gmail.com
- ernst@hatake.eu

## Test Account
- test@test.com / password

## Upcoming Tasks
1. Verify video calls with real 2-user test (P1)
2. Complete Admin Panel Settings tab (P2)

## Future Backlog
- Payment gateway integration (Stripe)
- Card deck sharing functionality
- Find duplicates feature in collection
- Sealed product management
- Mobile Android application
