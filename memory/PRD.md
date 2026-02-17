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
- Support for card conditions, finish variants
- Graded card tracking (PSA, BGS, CGC, SGC)

### Social Features  
- Social Feed with posts, comments, nested replies
- Emoji reactions on posts and comments
- Community page - Combined Friends + Groups with tabs
- User profiles with stats

### Search
- Universal search - Cards, Users, Posts, Decks all in one place
- Game filter (All, Pokemon, MTG) - correctly segregates results
- Users/Posts/Decks always displayed when searching

### Messaging & Calls
- Real-time messaging via MessengerWidget
- **Message timestamps** - "Just now", "5m ago", "Yesterday 3:45 PM", etc.
- **Date separators** - "Today", "Yesterday", "Monday", "January 15, 2026"
- **Message search** - Filter messages in conversation
- **Media gallery** - View all shared images/videos in conversation
- **Fullscreen media viewer** - Click to view media full screen
- **Send pictures/videos** - Media upload support
- WebRTC voice/video calls with incoming call notifications
- **Audio-only fallback** - Works on devices without cameras

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
- Server-side API caching for Scryfall and TCGdex API calls
- Cache stored in PostgreSQL `api_cache` table with TTL

## Tech Stack
- **Framework:** Next.js 15+ with App Router
- **Database:** PostgreSQL (Neon)
- **Styling:** Tailwind CSS, shadcn/ui
- **Card APIs:** Scryfall (MTG), TCGdex (Pokemon)
- **Auth:** Emergent-managed Google OAuth, JWT sessions

## What's Been Implemented

### February 17, 2026 - Session 4 (Latest)

**Video Call Fixes:**
- ✅ `peerConnectionRef.current` now assigned immediately in `createPeerConnection()` (line 221)
- ✅ `initializeCall()` creates peer connection FIRST, before getting media
- ✅ Media has fallback - if video fails, tries audio-only
- ✅ Polling only starts AFTER peer connection exists
- ✅ `handleOffer` and `handleIceCandidate` queue operations if peer connection not ready
- ✅ Proper signaling state checks before setting remote description

**Messenger Features Added:**
- ✅ `formatMessageTime()` - "Just now", "5m ago", "3:45 PM", "Yesterday", etc.
- ✅ `formatDateSeparator()` - Date headers between message groups
- ✅ `messageSearch` - Filter messages in conversation
- ✅ `loadMediaGallery()` - View all shared media
- ✅ `fullscreenMedia` - Click media to view full screen
- ✅ Conversation timestamps in sidebar
- ✅ Media gallery modal with grid view

**Previous Fixes (This Session):**
- Search API game filter (game=mtg only returns MTG cards)
- CSV import currency display (shows original currency)
- Universal search (cards, users, posts, decks)
- Community page, Settings page, Admin tools

**Testing:** 9/9 backend tests passed (iteration_6.json)

## Key Files
- `/app/components/VideoCall.tsx` - Line 221: `peerConnectionRef.current = pc;`
- `/app/app/messages/page.tsx` - Lines 75-129: timestamp functions, search, gallery

## Known Issues
- 🔧 **Video calls** - Code reviewed and fixed, needs real two-user WebRTC test
- ✅ All other reported issues fixed and tested

## Test Accounts
- **Regular:** test@test.com / password
- **Admin:** zudran@gmail.com, ernst@hatake.eu

## Ready for Mobile App
All requested features are now implemented:
- ✅ Video/voice calls with camera fallback
- ✅ Message timestamps and dates
- ✅ Message search
- ✅ Media gallery/history
- ✅ Send pictures/videos
- ✅ Universal search
- ✅ Admin tools

## Future/Backlog
- Payment gateway integration (Stripe)
- Card deck sharing functionality
- Find duplicates feature in collection
- Sealed product management
- **Mobile App Development**
