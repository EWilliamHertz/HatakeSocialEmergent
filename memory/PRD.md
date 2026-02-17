# Hatake.Social - TCG Trading Platform PRD

## Original Problem Statement
Create a comprehensive full-stack TCG (Trading Card Game) social platform with:
- Card collection management (MTG and Pokémon)
- Marketplace for buying/selling
- Trading system
- Social features (feed, messaging, groups)
- Real-time video/voice calls

## Core Requirements
1. **Authentication**: Google Sign-In and Email/Password
2. **Card Management**: Search, collect, CSV import, pricing
3. **Social**: Feed with posts/comments/reactions, Friends, Groups
4. **Messaging**: Real-time with media sharing
5. **Commerce**: Marketplace, trades, shop
6. **Admin Panel**: User management, content moderation

## What's Been Implemented

### February 17, 2026 - Session Updates
- ✅ Bulk list for sale - Backend API and frontend modal with individual pricing
- ✅ CSV Import game type selector - MTG/Pokemon dropdown added
- ✅ Dark mode on Trades page - CSS classes updated
- ✅ Trade detail page - Shows card names, values, and info
- ✅ Trade creation sends card names/prices - Fixed data structure
- ✅ Trade values in EUR - Changed from $ to €
- ✅ Admin delete community decks - Added functionality
- ✅ Payment info (Swish/bank) - Added to shop checkout (123-587 57 37, 9660-357 25 85, 5051-0031)
- ✅ Email updated to ernst@hatake.eu
- ✅ Feed emoji/comment rows - Combined into single section
- ✅ Messenger photo expand - Changed to fullscreen modal
- ✅ "Member since Invalid Date" - Fixed with fallback
- ✅ Profile Quick Actions → Collection + Items for Sale sections
- ✅ Profile Settings modal - Added payment details, shipping address, banner URL
- ✅ Trade detail shows payment/shipping info - Displayed when trade accepted

### Previous Sessions
- CSV Import for MTG (ManaBox) and Pokémon formats
- MTG Search via backend proxy (CORS fix)
- Unified Search page
- Dark mode consistency
- Admin tools (promote/demote users, delete posts)
- Avatar dropdown menu
- Combined Community page (Friends + Groups)
- Server-side API caching
- Messenger enhancements (timestamps, search, media gallery)

## Database Schema Updates
New columns added to `users` table:
- `banner_url TEXT`
- `shipping_address TEXT`
- `payment_swish TEXT`
- `payment_bankgiro TEXT`
- `payment_account TEXT`

## Known Issues / Remaining Work

### P0 - Critical
- WebRTC video calls - Still needs WebSocket refactor (partner suggestion provided)

### P1 - Important
- Banner interchange on profiles/groups - UI for changing banner images
- Groups expand info then enter - UX improvement
- Trade overview dashboard - Summary of ongoing/completed trades with values

### P2 - Future
- Mobile app development (user ready when web stable)
- Payment gateway (Stripe)
- Find duplicates in collection
- Sealed product management
- Advanced marketplace filters
- Admin Panel analytics tab

## Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL (Neon)
- **Auth**: NextAuth.js
- **APIs**: Scryfall (MTG), TCGdex (Pokemon)

## Test Credentials
- **Test User**: test@test.com / password
- **Admin Emails**: zudran@gmail.com, ernst@hatake.eu

## Payment Information (Shop)
- **Swish**: 123-587 57 37
- **Kontonummer**: 9660-357 25 85
- **Bankgiro**: 5051-0031
- **Contact**: ernst@hatake.eu
