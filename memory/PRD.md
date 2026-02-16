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
- Collection value calculation with pricing from Cardmarket
- Support for card conditions, foil status, quantity tracking

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
- **Card APIs:** Scryfall (MTG), TCGdex (Pokemon)
- **Auth:** Emergent-managed Google OAuth, JWT sessions

## What's Been Implemented

### February 2026 - Session 2
- Fixed "Missing required fields" bug when adding Pokemon cards
- Fixed collection page crash (React child object error)
- Added Pokemon card pricing support (via TCGdex/Cardmarket)
- Added set code aliases for Pokemon (JTG -> sv09, etc.)
- Fixed admin panel analytics stats cards (Tailwind JIT issue)
- Fixed admin APIs using wrong table name (collection -> collection_items)
- Verified Messenger Widget is working (requires login)

### Previous Session
- Social Feed with comments, replies, emoji reactions
- Video call rework with incoming call notifications
- About Us and Shop pages
- Admin panel with shop inventory management
- Replaced Pokemon TCG SDK with TCGdex API
- Card search by name feature

## Known Issues
1. **Video calls unstable** - Connections drop shortly after establishing (P0)
2. **Pokemon cards added before fix have no pricing** - Need to re-add or fetch pricing

## Upcoming Tasks
1. Advanced marketplace filters (P1)
2. User verification of group chat/messaging and member invites (P2)

## Future Backlog
- Payment gateway integration for Shop (Stripe recommended)
- Card deck sharing functionality
- Mobile Android application

## Admin Accounts
- zudran@gmail.com
- ernst@hatake.eu

## API Integrations
- **Scryfall:** Magic: The Gathering card data
- **TCGdex:** Pokemon TCG card data with Cardmarket pricing
- **Emergent Google Auth:** User sign-in
