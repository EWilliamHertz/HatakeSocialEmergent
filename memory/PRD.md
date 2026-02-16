# Hatake.Social - Product Requirements Document

## Overview
Hatake.Social is a modern, full-stack TCG (Trading Card Game) social platform built with Next.js 15+, FastAPI (proxy backend), and PostgreSQL (Neon).

## Original Problem Statement
Create a new TCG social platform featuring:
- Authentication (Google Sign-In + Email/Password)
- Card Management (Pokemon TCG API + Scryfall/MTG API)
- Social Features (Feed, Friends, Groups, Real-time Messaging)
- Commerce (Marketplace for buying/selling cards)
- User Profiles & Deck Builder

## Current Architecture
- **Frontend**: Next.js 15+ with App Router (TypeScript)
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
- [x] Google OAuth via Emergent Auth (session cookie now properly set)
- [x] Session management with httpOnly cookies
- [x] Auth callback page

### Features Implemented
1. **Renamed App**: "TCG Social Hub" → "Hatake.Social" (all references updated)
2. **Card Search**: Scryfall/MTG search working
3. **Marketplace**: Listings with card data, pricing, conditions
4. **Social Feed**: Posts with profile links on avatars
5. **Friends System**: Add/remove friends, friendship status
6. **Messaging System** (Enhanced):
   - Shift+Enter for new lines
   - Emoji picker (emoji-picker-react)
   - Sound notifications for new messages
   - Message anyone (not just friends)
   - Media messages support (images/videos in database schema)
   - Voice/Video call buttons (placeholder for WebRTC)
7. **Dark Mode**: ThemeProvider implemented
8. **Notifications**: System with API endpoints
9. **Groups**: Placeholder page created
10. **Auth Prompts**: Modal for unauthenticated users

## Database Schema Additions
- `messages.message_type` VARCHAR(50) DEFAULT 'text' - For text/image/video types
- `messages.media_url` TEXT - For storing media URLs

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
- `GET /api/users/search` - Search all users (for messaging anyone)
- `POST /api/upload` - File upload for media
- `GET /api/friends` - List friends
- `GET /api/feed` - Social feed
- `GET /api/notifications` - User notifications

### Known Issues
- Pokemon TCG API: External timeout (504) - Not a code issue
- External preview URL may show "Preview Unavailable" - Platform infrastructure issue

## File Structure (Key Files)
```
/app/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── auth/           # Authentication
│   │   ├── messages/       # Messaging
│   │   ├── marketplace/    # Marketplace
│   │   ├── upload/         # File uploads (NEW)
│   │   └── users/search/   # User search
│   ├── auth/               # Auth pages
│   ├── feed/               # Social feed
│   ├── marketplace/        # Marketplace page
│   ├── messages/           # Messages page (ENHANCED)
│   └── profile/            # User profiles
├── backend/                # FastAPI proxy
│   └── server.py           # Proxy server (routes all traffic to Next.js)
├── components/             # Shared components
│   ├── MessengerWidget.tsx # Chat widget (ENHANCED)
│   ├── Navbar.tsx          # Navigation
│   ├── AuthPromptModal.tsx # Auth prompt
│   └── ThemeProvider.tsx   # Dark mode
└── lib/                    # Utilities
    ├── db.ts               # Database connection
    ├── auth.ts             # Auth helpers
    └── db-schema.sql       # Database schema
```

## P0 Issues - Resolved
1. ✅ App renamed to "Hatake.Social"
2. ✅ Google Auth session cookie properly set
3. ✅ Messaging shift+enter, emojis, sounds implemented
4. ✅ Message anyone (not just friends)
5. ✅ Profile links on feed avatars

## P1 Issues - Pending
1. Marketplace client-side error (needs user testing to reproduce)
2. Voice/Video calls (WebRTC implementation)
3. Groups full implementation (currently placeholder)
4. Pokemon API timeout (external issue)

## P2/Future Tasks
- Deck Builder feature
- Advanced marketplace filtering
- WebRTC voice/video with screensharing
- Mobile application
- Prisma ORM integration

## Environment Variables
- `DATABASE_URL` - Neon PostgreSQL connection string
- `REACT_APP_BACKEND_URL` - External preview URL
- Google OAuth handled via Emergent Auth

## Deployment Notes
- Preview may show "Unavailable" when pod is sleeping - this auto-resolves on activity
- Local testing: `http://localhost:8001` for all requests
- Backend proxy is essential for platform routing
