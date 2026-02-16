# Hatake.Social - Product Requirements Document

## Overview
Hatake.Social is a modern, full-stack TCG (Trading Card Game) social platform built with Next.js 15+, FastAPI (proxy backend), and PostgreSQL (Neon).

## Original Problem Statement
Create a new TCG social platform featuring:
- Authentication (Google Sign-In + Email/Password)
- Card Management (Pokemon TCG API + Scryfall/MTG API)
- Social Features (Feed, Friends, Groups, Real-time Messaging with Video Calls)
- Commerce (Marketplace for buying/selling cards, Trading)
- User Profiles & Deck Builder with Import functionality

## Current Architecture
- **Frontend**: Next.js 16+ with App Router (TypeScript)
- **Backend Proxy**: FastAPI (Python) at port 8001 - proxies to Next.js at port 3000
- **Database**: PostgreSQL (Neon) - user-provided external database
- **Styling**: Tailwind CSS
- **UI Components**: Custom components + Lucide Icons

## What's Been Implemented

### Core Infrastructure
- [x] FastAPI proxy backend to handle platform routing (port 8001 → 3000)
- [x] PostgreSQL (Neon) database connection
- [x] Session-based authentication with cookies
- [x] Scryfall API integration for MTG cards (WORKING)

### Authentication
- [x] Email/Password signup and login
- [x] Google OAuth via Emergent Auth (session cookie properly set)
- [x] Session management with httpOnly cookies
- [x] Auth callback page

### Features Implemented
1. **Renamed App**: "TCG Social Hub" → "Hatake.Social" (all references updated)
2. **Card Search**: Scryfall/MTG search working
3. **Marketplace**: Fixed price.toFixed() error - prices now properly converted from string
4. **Social Feed**: Posts with profile links on avatars
5. **Friends System**: Add/remove friends, friendship status
6. **Messaging System** (Enhanced):
   - Shift+Enter for new lines
   - Emoji picker (emoji-picker-react)
   - Sound notifications for new messages
   - Message anyone (not just friends)
   - Media messages support (images/videos in database schema)
   - **WebRTC Voice/Video Calls with Screensharing** (WORKING with REST Polling)
7. **Dark Mode**: ThemeProvider implemented
8. **Notifications**: System with API endpoints
9. **Groups/Communities** (FULL FEATURE):
   - Create public/private groups
   - Group detail page with Posts/Members tabs
   - Post to groups, like posts
   - Member management with roles (admin, moderator, member)
   - Join/leave groups
10. **Auth Prompts**: Modal for unauthenticated users
11. **Deck Builder** (FULL FEATURE):
    - Create decks for MTG and Pokemon
    - Choose format (Standard, Modern, Commander, etc.)
    - Public/private visibility
    - Search and add cards from Scryfall API
    - Manage card quantities (add/remove/update)
    - Main deck and sideboard categories
    - Deck settings editor
    - **Import decklist from text** (WORKING)
12. **Trades** (FULL FEATURE):
    - `/trades/new` page for creating new trade offers
    - Select trade partner from friends
    - Add cards from collection to offer
    - Request specific cards
    - Add notes to trade
    - View active trades

### Video Calling - REST Polling Implementation (Serverless Compatible)
- **NEW**: REST API at `/api/calls` for signaling (replaces WebSocket)
- In-memory signal store for low-latency polling
- Supports all signaling: offers, answers, ICE candidates, call events
- Video/Voice call buttons in MessengerWidget and Messages page
- Full-screen video call interface
- Voice call mode (audio only)
- Video call mode (audio + video)
- Screen sharing with system audio
- Mute/unmute microphone
- Toggle camera on/off
- Call duration timer
- Fullscreen mode
- Connection status indicators
- Error handling for camera/mic access

### Collection Management
- View collection with card pricing
- Bulk listing with **percentage of market price** option (WORKING)
- Fixed price option
- Bulk delete functionality
- Edit card details (condition, quantity, foil, notes)

## Database Schema
- `messages.message_type` VARCHAR(50) DEFAULT 'text' - For text/image/video types
- `messages.media_url` TEXT - For storing media URLs
- `trades` table with initiator_id, receiver_id, initiator_cards, receiver_cards, message, status

## API Endpoints

### Working
- `GET /api/search?game=mtg&q=[query]` - Card search (Scryfall)
- `GET /api/marketplace` - List marketplace items
- `POST /api/marketplace` - Create listing
- `GET /api/auth/me` - Get current user
- `POST /api/auth/login` - Email login
- `POST /api/auth/signup` - Email signup
- `POST /api/auth/session` - Google OAuth session exchange
- `GET /api/messages` - List conversations
- `GET /api/messages/[id]` - Get messages in conversation
- `POST /api/messages` - Send message (supports media)
- `GET /api/users/search` - Search all users
- `POST /api/upload` - File upload for media
- `GET /api/friends` - List friends
- `GET /api/feed` - Social feed
- `GET /api/notifications` - User notifications
- `GET /api/decks` - List user's decks
- `POST /api/decks` - Create deck
- `GET /api/decks/[id]` - Get deck details
- `PATCH /api/decks/[id]` - Update deck settings
- `DELETE /api/decks/[id]` - Delete deck
- `POST /api/decks/[id]/cards` - Add card to deck
- `GET /api/trades` - List trades
- `POST /api/trades` - Create trade offer
- `GET /api/calls` - Poll for signaling messages (WORKING)
- `POST /api/calls` - Send signaling message (WORKING)
- `DELETE /api/calls` - End call/clear signals (WORKING)
- `GET /api/groups` - List groups
- `POST /api/groups` - Create group
- `GET /api/groups/[id]` - Get group details
- `POST /api/groups/[id]/posts` - Create group post
- `POST /api/collection/bulk-list` - Bulk list with % pricing (WORKING)

### Known Issues
- Pokemon TCG API: External timeout (504) - Not a code issue, API is down

## File Structure (Key Files)
```
/app/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── auth/           # Authentication
│   │   ├── calls/          # Video call signaling (NEW - REST polling)
│   │   ├── messages/       # Messaging
│   │   ├── marketplace/    # Marketplace
│   │   ├── decks/          # Deck Builder API
│   │   ├── trades/         # Trading API
│   │   ├── groups/         # Groups API
│   │   └── upload/         # File uploads
│   ├── auth/               # Auth pages
│   ├── decks/              # Deck Builder pages
│   ├── trades/             # Trading pages (including /new)
│   ├── feed/               # Social feed
│   ├── groups/             # Groups pages
│   ├── marketplace/        # Marketplace page
│   ├── messages/           # Messages page (with video calls)
│   └── profile/            # User profiles
├── backend/                # FastAPI proxy
│   └── server.py           # Proxy server
├── components/             # Shared components
│   ├── VideoCall.tsx       # Video call component (REST polling)
│   ├── MessengerWidget.tsx # Chat widget (with call buttons)
│   ├── Navbar.tsx          # Navigation
│   ├── AuthPromptModal.tsx # Auth prompt
│   └── ThemeProvider.tsx   # Dark mode
└── lib/                    # Utilities
    ├── db.ts               # Database connection
    ├── auth.ts             # Auth helpers
    └── db-schema.sql       # Database schema
```

## Issues Resolved (This Session)
1. ✅ Video calls now use REST polling instead of WebSocket (serverless compatible)
2. ✅ `/trades/new` page working correctly
3. ✅ Bulk listing with % of market price working
4. ✅ Deck import functionality working
5. ✅ Video/Voice call buttons added to MessengerWidget
6. ✅ Fixed trades API column name mismatch (receiver_id, initiator_cards, receiver_cards)
7. ✅ Fixed collection page syntax error

## P2/Future Tasks
- Advanced marketplace filtering
- TURN server for robust NAT traversal
- Mobile application
- Card scanner (camera-based identification)
- Advanced analytics
- Invite members to private groups
- Group chat/messaging
- Card deck sharing functionality

## Environment Variables
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- Google OAuth handled via Emergent Auth

## Testing
- All 17 backend API tests passing
- All frontend pages load correctly
- Video call REST polling API verified working

## Last Updated
December 2025
