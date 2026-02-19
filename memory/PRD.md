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

### February 19, 2026 - Latest Session
- ✅ **Messages page Groups tab** - Direct messages and group chats are now in the same Messages page with tabs
  - "Direct" tab for 1-on-1 conversations
  - "Groups" tab shows joined groups with chat capability
  - Full group chat interface with message input, emoji picker, media upload
- ✅ **MessengerWidget Groups button** - Icon button in header opens full Messages page for group chats
- ✅ **Video calls WebSocket fix** - Changed WebSocket URL to use `/api/ws/signaling/` prefix for external proxy routing
- ✅ **Backend dual WebSocket routes** - Both `/ws/signaling/` and `/api/ws/signaling/` routes for compatibility
- ✅ **Shop "Add to Cart" bug fixed** - Clicking Add to Cart no longer opens product modal (e.stopPropagation() fix)
- ✅ **Thumb emoji removed from reactions** - Feed reactions: ❤️, 😂, 😮, 😢, 😡, 🔥, 💯 (no 👍)
- ✅ **Groups page enhanced** with:
  - Quick Stats section (My Groups, Public, Admin, Total Members)
  - Public/Private badges on group cards with color coding
  - Expand/collapse "More" button for group details
  - Activity indicators support
  - Banner image display support
- ✅ **Favicon set** to Hatake.Social logo (PNG from Imgur)

### February 17, 2026 - Evening Session
- ✅ Removed heart emoji from feed reactions (redundant with like button)
- ✅ Messenger widget image expand - Click opens fullscreen modal
- ✅ Admin panel shop photo uploads - Main image + gallery images
- ✅ Shop product detail modal with photo gallery system
- ✅ Product descriptions support **BOLD** markdown formatting
- ✅ Groups UX improved - Click to expand info, Enter button on right
- ✅ Trade overview dashboard - Stats showing active/completed/total value
- ✅ Trade tabs show counts (Active, Completed)

### February 17, 2026 - Earlier Session
- ✅ Bulk list for sale with individual pricing
- ✅ CSV Import game selector (MTG/Pokemon dropdown)
- ✅ Dark mode on Trades page
- ✅ Trade detail page with card names, values, totals
- ✅ Profile settings with payment details and shipping address
- ✅ Trade detail shows payment/shipping info when accepted
- ✅ Feed emoji reactions in single section
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
