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
3. **Marketplace**: Fixed price.toFixed() error - prices now properly converted from string
4. **Social Feed**: Posts with profile links on avatars
5. **Friends System**: Add/remove friends, friendship status
6. **Messaging System** (Enhanced):
   - Shift+Enter for new lines
   - Emoji picker (emoji-picker-react)
   - Sound notifications for new messages
   - Message anyone (not just friends)
   - Media messages support (images/videos in database schema)
   - **WebRTC Voice/Video Calls with Screensharing** (IMPLEMENTED)
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
    - View deck statistics

### WebRTC Video Calling Features
- WebSocket signaling server in FastAPI backend
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
6. ✅ Marketplace blank screen - Fixed price.toFixed() error
7. ✅ WebRTC Voice/Video calls with screensharing
8. ✅ WebSocket signaling server for peer-to-peer calls
9. ✅ Full Groups/Communities feature

## P1 Issues - Pending
1. Pokemon API timeout (external issue - not code-related)

## Groups Feature - COMPLETE
- Create groups (public/private)
- Join/leave groups
- Group detail page with tabs (Posts/Members)
- Post to groups
- Like posts
- View members with role badges
- Admin can manage settings
- Member roles (admin, moderator, member)

## WebRTC Video Calling - COMPLETE
- WebSocket signaling server in FastAPI backend
- Peer-to-peer SDP offer/answer exchange
- ICE candidate exchange
- Voice and video calls
- Screen sharing with system audio
- Mute/unmute, camera toggle
- Call duration timer
- Fullscreen mode
- Connection status indicators

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
