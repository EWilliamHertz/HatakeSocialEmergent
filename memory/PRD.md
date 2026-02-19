# Hatake.Social - TCG Trading Platform PRD

## Original Problem Statement
Create a comprehensive full-stack TCG (Trading Card Game) social platform with:
- Card collection management (MTG and Pokémon)
- Marketplace for buying/selling
- Trading system with value tracking
- Social features (feed, messaging, groups)
- Real-time video/voice calls (WebRTC)

## Core Requirements
1. **Authentication**: Google Sign-In and Email/Password
2. **Card Management**: Search, collect, CSV import (MTG/Pokemon), pricing
3. **Social**: Feed with posts/comments/reactions, Friends, Groups
4. **Messaging**: Real-time with media sharing and fullscreen image view
5. **Commerce**: Marketplace, trades with value summary, shop with product gallery
6. **Admin Panel**: User management, content moderation, shop management with photo uploads

## What's Been Implemented

### February 19, 2026 - Current Session (11 Issues Fixed)
- ✅ **Issue 1: Group banner fixed** - Banner no longer overlaps text, clean layout with icon on left
- ✅ **Issue 2: Group Settings modal** - Admins/owners can now edit name, description, privacy, banner URL, and delete group
- ✅ **Issue 3: Groups page tabs** - Added "Invites" tab for pending group invites with accept/decline buttons
- ✅ **Issue 4: Click outside modal** - Add Card modal now closes when clicking outside
- ✅ **Issue 6: Trade profile links** - User names in trade window are now clickable links to profiles
- ✅ **Issue 7 & 8: Marketplace delete** - Admins and owners can delete listings (red trash button on hover)
- ✅ **Issue 9: Marketplace filters** - Game-specific Expansion and Rarity filters appear when game is selected
- ✅ **Issue 10: Trade cash request** - Can now request EUR/USD/SEK amount in trade creation
- ✅ **Issue 11: Messenger widget Groups** - Purple "Groups" button next to "New Chat" opens full Messages page

### Earlier February 19, 2026
- ✅ Messages page Groups tab with group chat functionality
- ✅ Video calls WebSocket routing fix (`/api/ws/signaling/`)
- ✅ Shop "Add to Cart" bug fix
- ✅ Thumb emoji removed from reactions
- ✅ Groups page Quick Stats and enhanced cards
- ✅ Favicon set to Hatake.Social logo

### February 17, 2026
- ✅ All previous features including trade values, admin features, messenger media, etc.

## Database Updates
- Added `cash_requested` (DECIMAL 10,2) and `cash_currency` (VARCHAR 3) to trades table

## Known Issues / Remaining Work

### P0 - Critical
- ⚠️ **Issue 5: Trade value shows 0.00** - Card prices might not be coming through from collection data. Needs investigation into how card_data prices are stored and retrieved.
- ⚠️ **WebSocket on production** - `wss://www.hatake.eu/api/ws/signaling/` fails - needs WebSocket proxy configuration on production server (Nginx/reverse proxy config)

### P1 - Important  
- Profile/group banner image upload UI
- Pokemon CSV import full end-to-end testing
- Deck infographics (mana curve, color distribution)

### P2 - Future Enhancements
- Mobile app design/development
- Payment gateway (Stripe)
- Find duplicates in collection
- Sealed product management
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
- ✅ Messages photo expand to fullscreen modal
- ✅ Admin can delete community decks
- ✅ Shop payment info (Swish, Bankgiro, Account)
- ✅ Email updated to ernst@hatake.eu
- ✅ "Member since Invalid Date" fixed
- ✅ Profile shows Collection + Items for Sale sections

### Previous Sessions
- CSV Import for MTG (ManaBox) and Pokémon formats
- MTG Search via backend proxy
- Unified Search page
- Dark mode consistency
- Admin tools (promote/demote users, delete posts)
- Avatar dropdown menu
- Combined Community page
- Server-side API caching
- Messenger enhancements

## Database Updates
- `users` table: banner_url, shipping_address, payment_swish, payment_bankgiro, payment_account
- `shop_products` table: gallery_images TEXT[]

## Known Issues / Remaining Work

### P0 - Critical
- ⚠️ WebRTC video calls - Needs end-to-end testing between two users

### P1 - Important  
- Profile/group banner image upload UI
- Pokemon CSV import full end-to-end testing with real file
- Deck infographics (mana curve, color distribution)

### P2 - Future Enhancements
- Mobile app design/development
- Payment gateway (Stripe)
- Find duplicates in collection
- Sealed product management
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
