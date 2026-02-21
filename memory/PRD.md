# Hatake.Social - TCG Trading Platform PRD

## Original Problem Statement
Create a comprehensive full-stack TCG (Trading Card Game) social platform with card management, marketplace, social features, and trading capabilities.

## Tech Stack

### Web Application
- Next.js 16+ with App Router
- TypeScript, Tailwind CSS, shadcn/ui
- PostgreSQL (Neon)
- Cloudinary (image storage)
- TCGdex API (Pokemon), Scryfall API (MTG)

### Mobile Application
- React Native with Expo
- React Navigation (Native Stack + Bottom Tabs)
- Native fetch (API Client)

## Test Credentials
- **Test User**: test@test.com / password (admin)

---

## COMPLETED FEATURES - Session 2026-02-22

### Latest Features (This Session)

1. **Friends System** ✅
   - Full Friends screen accessible from hamburger menu
   - Three tabs: Friends list, Pending Requests, Search/Find users
   - Send/Accept/Reject friend requests
   - Remove existing friends
   - Search users by name or email
   - Chat button to message friends directly

2. **Messaging System** ✅
   - Full messaging screen with conversations list
   - Real-time chat with friends
   - Message polling for updates (every 3 seconds)
   - Time formatting (today, yesterday, date)
   - Unread message badges
   - Direct chat from Friends screen

3. **Video/Voice Call UI** ✅
   - Audio and Video call buttons in chat header
   - Full-screen call interface
   - Call states: connecting, ringing, connected, ended
   - Call controls: mute, camera toggle, speaker, end call
   - Call duration timer
   - Animated pulse ring during ringing
   - Note: Full WebRTC streaming requires native build

4. **Backend API Updates** ✅
   - All messaging APIs now support Bearer token auth
   - All call/signaling APIs support Bearer token auth
   - LiveKit token API supports Bearer token auth
   - User search API supports Bearer token auth

### Previous Session Features
- Hamburger Menu on All Pages
- Comment Reactions (Emoji)
- View User Collections
- MTG Search with Edition Picker
- Feed Comments System
- Bulk Card Selection & Delete

---

## KEY API ENDPOINTS

### Friends System
- `GET /api/friends` - Get friends list
- `POST /api/friends` - Send/Accept/Reject/Remove friend
- `GET /api/friends/requests` - Get pending friend requests
- `GET /api/users/search?q=` - Search users

### Messaging
- `GET /api/messages` - Get conversations list
- `POST /api/messages` - Send message / create conversation
- `GET /api/messages/{conversationId}` - Get messages in conversation

### Video Calls
- `POST /api/livekit/token` - Get LiveKit room token
- `GET /api/calls` - Poll for call signals
- `POST /api/calls` - Send call signal
- `DELETE /api/calls` - End call

### Collection Management
- `GET /api/collection` - Get own collection
- `GET /api/users/{userId}/collection` - View user's collection
- `POST /api/collection` - Add card
- `DELETE /api/collection?id={id}` - Delete card

### Feed & Social
- `GET /api/feed` - Get posts with reactions
- `POST /api/feed/{postId}/comments` - Add comment
- `GET /api/feed/{postId}/comments` - Get comments

---

## MOBILE APP FEATURES STATUS

| Feature | Status |
|---------|--------|
| Authentication | ✅ Complete |
| Collection View | ✅ Complete |
| Add Cards (MTG + Pokemon) | ✅ Complete |
| Bulk Delete | ✅ Complete |
| Feed View | ✅ Complete |
| Like/Emoji Posts | ✅ Complete |
| Comments | ✅ Complete |
| Comment Reactions | ✅ Complete |
| View User Profiles | ✅ Complete |
| View User Collections | ✅ Complete |
| Marketplace View | ✅ Complete |
| Profile Screen | ✅ Complete |
| Hamburger Menu (All Pages) | ✅ Complete |
| **Friends System** | ✅ Complete |
| **Messaging** | ✅ Complete |
| **Video/Voice Call UI** | ✅ Complete |
| Trading | ⏳ Not started |

---

## NEXT STEPS

### High Priority (P1)
1. LiveKit native integration for real video/audio streaming (requires Expo development build)
2. Trading functionality
3. Notifications display screen

### Medium Priority (P2)
1. Delete own marketplace listings
2. Create listings from collection
3. Screen sharing in calls

---

## FILES REFERENCE

### Mobile Screens
- `mobile/hatake-mobile/App.tsx` - Main app with modals for Friends/Messages/Calls
- `mobile/hatake-mobile/src/screens/FriendsScreen.tsx` - Friends management
- `mobile/hatake-mobile/src/screens/MessagesScreen.tsx` - Messaging/Chat
- `mobile/hatake-mobile/src/screens/VideoCallScreen.tsx` - Voice/Video call UI

### Backend APIs (Updated for Bearer auth)
- `app/api/messages/route.ts` - Conversations list & send message
- `app/api/messages/[conversationId]/route.ts` - Get messages
- `app/api/friends/route.ts` - Friends actions
- `app/api/calls/route.ts` - Call signaling
- `app/api/livekit/token/route.ts` - LiveKit token generation
- `app/api/users/search/route.ts` - User search

---

*Last Updated: February 22, 2026*
