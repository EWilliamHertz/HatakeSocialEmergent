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
- **JTG/official set code aliases** supported (JTG -> sv09, etc.)
- Collection value calculation with multi-currency support (EUR + USD)
- Support for card conditions, finish variants (Holofoil, Reverse Holofoil, etc.)
- Graded card tracking (PSA, BGS, CGC, SGC)

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

### February 17, 2026 - Session 3
**Bug Fixes & Features:**
- Fixed MTG card search (was timing out, added AbortController)
- Fixed "Missing required fields" error when adding Pokemon cards
- Fixed JTG + 24 search (Journey Together set code alias sv09)
- Added price display in search results modal (green badges)
- Fixed multi-currency support (EUR € for Pokemon, USD $ for MTG)
- Created enhanced "Add to Collection" modal with:
  - Card preview with price info
  - Quantity input
  - Finish dropdown (Normal, Holofoil, Reverse Holofoil, Pokeball Holofoil, Masterball Holofoil, etc. for Pokemon)
  - Condition dropdown (Mint to Poor)
  - "Add as graded card" checkbox with grading company and grade selection
- Fixed collection page display showing correct currency per card type
- Fixed admin panel stats (using correct table names)

### Previous Sessions
- Social Feed with comments, replies, emoji reactions
- Video call rework with incoming call notifications
- About Us and Shop pages
- Admin panel with shop inventory management
- Replaced Pokemon TCG SDK with TCGdex API
- Card search by name feature

## Known Issues
1. **Video calls unstable** - Connections may drop shortly after establishing (P0)

## Upcoming Tasks
1. Advanced marketplace filters (P1)
2. Image upload for custom card photos
3. Signed card tracking option
4. User verification of group chat/messaging and member invites (P2)

## Future Backlog
- Payment gateway integration for Shop (Stripe recommended)
- Card deck sharing functionality
- Mobile Android application

## Admin Accounts
- zudran@gmail.com
- ernst@hatake.eu

## API Integrations
- **Scryfall:** Magic: The Gathering card data with USD pricing
- **TCGdex:** Pokemon TCG card data with Cardmarket (EUR) pricing
- **Emergent Google Auth:** User sign-in

## Set Code Aliases Supported (Pokemon)
| User Input | Resolves To | Set Name |
|------------|-------------|----------|
| jtg, journey, journeytogether | sv09 | Journey Together |
| tef, temporal | sv05 | Temporal Forces |
| par | sv04 | Paradox Rift |
| obsidian | sv03 | Obsidian Flames |
| paldea | sv02 | Paldea Evolved |
| scarlet, violet, svbase | sv01 | Scarlet & Violet Base |
