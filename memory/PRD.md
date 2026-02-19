# Hatake.Social - TCG Trading Platform PRD

## Original Problem Statement
Create a comprehensive full-stack TCG (Trading Card Game) social platform with:
- Card collection management (MTG and Pokémon)
- Marketplace for buying/selling
- Trading system with value tracking
- Social features (feed, messaging, groups)
- Real-time video/voice calls

## Core Requirements
1. **Authentication**: Google Sign-In and Email/Password
2. **Card Management**: Search, collect, CSV import (MTG/Pokemon), pricing
3. **Social**: Feed with posts/comments/reactions, Friends, Groups
4. **Messaging**: Real-time with media sharing and fullscreen image view
5. **Commerce**: Marketplace, trades with value summary, shop with product gallery
6. **Admin Panel**: User management, content moderation, shop management

## What's Been Implemented

### February 19, 2026 - Current Session
- ✅ **Marketplace Deletion Fix** - Fixed SQL query (was using non-existent column). Owners can now delete their listings
- ✅ **LiveKit Video Calls** - Integrated LiveKit for WebRTC video/audio calls (replaces custom WebSocket signaling)
- ✅ **Deck Analytics** - Full deck builder infographics:
  - Mana curve visualization
  - Color pie distribution
  - Card type breakdown
  - Format legality validation (Standard, Modern, Commander, etc.)
  - Deck playtesting (shuffle, draw sample hands)
  - Export decklist (MTGA format, plain text)
- ✅ **Collection Statistics** - Enhanced dashboard:
  - Rarity distribution
  - Game distribution (MTG/Pokemon)
  - Condition breakdown
  - Foil count
  - CSV export functionality
- ✅ **Pokemon Rarity Fix** - Cards now include rarity field when added
- ✅ **Pokemon CSV Import Enhancement** - Set code mapping (ASR → swsh10, etc.)
- ✅ **Suggestions Document** - Created `/app/SUGGESTIONS.md` with full roadmap

### February 19, 2026 - Previous Session (11 Issues Fixed)
- ✅ Group banner layout, settings modal, invites tab
- ✅ Marketplace filters (Expansion, Rarity)
- ✅ Trade cash requests (EUR/USD/SEK)
- ✅ Trade profile links
- ✅ Click-outside modal close
- ✅ Messenger widget groups button

### Earlier Sessions
- ✅ Messages page Groups tab
- ✅ WebSocket routing fix
- ✅ Shop functionality
- ✅ Groups page enhancements
- ✅ Favicon
- ✅ CSV imports for MTG/Pokemon
- ✅ Admin tools
- ✅ Dark mode
- ✅ And more...

## Database Updates
- `trades`: cash_requested, cash_currency columns
- `users`: banner_url, shipping_address, payment fields
- `shop_products`: gallery_images

## Known Issues / Remaining Work

### P0 - Critical
- ⚠️ **Shop Image Upload (500 error)** - File uploads fail on Vercel (serverless limitation). Need external storage (S3/Cloudinary)

### P1 - Important  
- ⬜ Trade value shows 0.00€ sometimes
- ⬜ Existing cards in DB missing rarity (need migration script)
- ⬜ Wishlists feature
- ⬜ Trade reputation system
- ⬜ Custom % pricing per card in bulk list

### P2 - Future Enhancements
- ⬜ Mobile app (PWA first, then React Native)
- ⬜ Payment gateway (Stripe)
- ⬜ Find duplicates in collection
- ⬜ Sealed product management
- ⬜ Admin Panel analytics tab
- ⬜ See `/app/SUGGESTIONS.md` for full roadmap

## Tech Stack
- **Framework**: Next.js 16+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL (Neon)
- **Auth**: NextAuth.js
- **APIs**: Scryfall (MTG), TCGdex (Pokemon)
- **Video Calls**: LiveKit (wss://hatakesocial-abnya21v.livekit.cloud)

## Test Credentials
- **Test User**: test@test.com / password
- **Admin Emails**: zudran@gmail.com, ernst@hatake.eu

## Payment Information (Shop)
- **Swish**: 123-587 57 37
- **Kontonummer**: 9660-357 25 85
- **Bankgiro**: 5051-0031
- **Contact**: ernst@hatake.eu

## Key Files Reference
- `/app/components/DeckAnalytics.tsx` - Deck infographics
- `/app/components/CollectionDashboard.tsx` - Collection stats
- `/app/components/LiveKitCall.tsx` - Video call UI
- `/app/app/api/livekit/token/route.ts` - LiveKit token generation
- `/app/app/api/marketplace/[listingId]/route.ts` - Marketplace delete
- `/app/SUGGESTIONS.md` - Full improvement roadmap
