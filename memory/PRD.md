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

## What's Been Implemented (December 2025)

### Core Infrastructure
- [x] FastAPI proxy backend to handle platform routing (port 8001 → 3000)
- [x] PostgreSQL (Neon) database connection
- [x] Session-based authentication with cookies (Fixed for HTTPS/preview deployments)
- [x] Scryfall API integration for MTG cards (WORKING)

### Authentication
- [x] Email/Password signup and login
- [x] Google OAuth via Emergent Auth (session cookie properly set)
- [x] Session management with httpOnly cookies
- [x] Fixed secure cookie flag for HTTPS previews

### Features Implemented

#### 1. **Card Search (Updated)**
- Full card image display
- Set code and collector number shown below each card
- Price display
- Add to collection button

#### 2. **Deck Builder (Enhanced)**
- **My Decks** and **Community Decks** tabs
- Community Decks with game/format filters
- Search decks by name
- Create public/private decks
- Choose format (Standard, Modern, Commander, etc.)
- **Multi-select delete**: Select multiple cards and delete them at once
- **Sideboard import**: Support for "SB:" or "Sideboard" prefix in imports
- Main deck and sideboard categories

#### 3. **Trades (Enhanced)**
- Search for **ANY user** (not just friends)
- Browse **other party's collection** with search and filters
- Add cards from your collection to offer
- Request cards from partner's collection
- Add notes to trade

#### 4. **Groups/Communities (Enhanced)**
- Create public/private groups
- Group detail page with multiple tabs:
  - **Posts Tab**: Create and view posts
  - **Chat Tab**: Real-time group chat messaging
  - **Members Tab**: View group members
  - **Invite Tab** (Admin only): Invite users to group
- Member management with roles (admin, moderator, member)
- Join/leave groups

#### 5. **Messaging System**
- Direct messaging between users
- Emoji picker
- Media uploads (images/videos)
- Shift+Enter for new lines
- Sound notifications
- **Video/Voice calls** with REST polling signaling (serverless compatible)

#### 6. **Collection Management**
- **ManaBox CSV Import** with preview modal
- View cards with pricing
- Bulk listing with % of market price option
- Edit card details

#### 7. **Video Calls (Fixed)**
- REST polling-based signaling (works on serverless/Vercel)
- WebRTC peer-to-peer connection
- Mute/unmute, camera toggle
- Screen sharing
- Fullscreen mode
- Call duration timer

### Database Tables
- `users` - User accounts
- `collections` - User card collections
- `decks` - User decks
- `deck_cards` - Cards in decks
- `groups` - Community groups
- `group_members` - Group membership
- `group_posts` - Posts in groups
- `group_messages` - Group chat messages (NEW)
- `group_invites` - Group invitations (NEW)
- `messages` - Direct messages
- `trades` - Trade offers
- `call_signals` - Video call signaling
- `notifications` - User notifications

## API Endpoints

### New/Updated Endpoints
- `GET/POST /api/decks/community` - Community decks with filters
- `GET /api/collection/user/[userId]` - Get user's collection for trades
- `GET/POST /api/groups/[groupId]/chat` - Group chat messages
- `GET/POST/DELETE /api/groups/[groupId]/invite` - Group invitations
- `GET/POST /api/groups/invites` - User's pending invites
- `GET/POST/DELETE /api/calls` - Video call signaling (REST polling)

## Issues Resolved This Session
1. ✅ Login not working on preview - Fixed cookie secure flag
2. ✅ Video calls stuck - Updated to database-backed signaling
3. ✅ Decks page - Added My Decks/Community Decks tabs
4. ✅ Trades - Can search any user, browse their collection
5. ✅ Search - Full card images with setcode and collector number
6. ✅ Deck - Multi-select delete functionality
7. ✅ Deck import - Sideboard support (SB: prefix)
8. ✅ Groups - Added Chat tab with real-time messaging
9. ✅ Groups - Added Invite tab to invite users to private groups

## Upcoming Tasks
- Advanced marketplace filters
- Admin dashboard with analytics (zudran@gmail.com, ernst@hatake.eu as admins)
- TURN server for robust NAT traversal

## Future/Backlog
- Mobile application (waiting until web is complete)
- Card scanner (camera-based identification)
- Advanced analytics

## Deployment Notes
- Video calls work on Emergent.SH deployment (REST polling is serverless compatible)
- Cookie secure flag auto-detects HTTPS
- All database-backed features persist across serverless instances

## Last Updated
December 2025
