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
- **Resend** (email notifications)
- **LiveKit** (video/voice calls)

### Mobile Application
- React Native with Expo
- React Navigation (Native Stack + Bottom Tabs)
- Native fetch (API Client)
- **LiveKit React Native** (video/voice calls - requires native build)

## Test Credentials
- **Test User**: test@test.com / password (admin)

---

## COMPLETED FEATURES - Session 2026-02-22 (Latest)

### Latest Batch: Push Notifications & Trading Reputation (Current Session)

1. **Push Notifications (Mobile)** ✅
   - Expo Push Notifications integration
   - Automatic push token registration on login
   - Notifications for friend requests, messages, trades
   - Android notification channel configured
   - Backend sends push via Expo Push API
   - Push token management endpoint (`/api/push-tokens`)

2. **Trading Reputation System** ✅
   - New `trade_ratings` database table
   - Rate completed trades (1-5 stars + comment)
   - Reputation screen with stats (avg rating, distribution)
   - View recent reviews
   - New endpoint (`/api/reputation`)
   - Push notifications when rated

3. **Wishlists (Mobile)** ✅
   - View all wishlists
   - Create new wishlists (public/private)
   - View wishlist contents
   - Delete wishlists
   - Backend APIs updated for Bearer auth

4. **Create Trades (Mobile)** ✅
   - 3-step trade creation flow
   - Select recipient (friends or search)
   - Select cards from collection
   - Review and send trade offer
   - Optional cash addition
   - Push notification to recipient

5. **Backend Push Notification Integration** ✅
   - Friend requests trigger push
   - New messages trigger push  
   - Trade offers trigger push
   - Trade status updates trigger push
   - Rating submissions trigger push

### Batch 2: Full Mobile Feature Parity

1. **Deck Builder (Mobile)** ✅
   - View all user decks with card counts
   - Create new decks (MTG/Pokemon, format selection)
   - View deck contents (main deck + sideboard)
   - Delete decks
   - Note: Adding cards to decks requires web app

2. **Trades (Mobile)** ✅
   - View all trades (incoming/outgoing)
   - Filter by status (all, pending, completed)
   - Trade detail view with user info
   - Accept/Decline incoming trades
   - Cancel pending outgoing trades
   - Cash addition display

3. **Groups/Communities (Mobile)** ✅
   - View "My Groups" and "Discover" tabs
   - Create new groups (public/private)
   - Join public groups
   - Leave groups
   - Member counts and role badges

4. **Notifications (Mobile)** ✅
   - View all notifications with icons
   - Mark individual as read
   - Mark all as read
   - Delete individual notifications
   - Clear all notifications
   - Unread badge count

5. **All Backend APIs Updated for Bearer Auth** ✅
   - `/api/decks` - List/Create decks
   - `/api/decks/[deckId]/cards` - GET/POST/DELETE/PATCH
   - `/api/trades` - List trades
   - `/api/trades/[id]` - GET/PATCH (accept/decline/cancel)
   - `/api/groups` - List/Create groups
   - `/api/groups/[groupId]/join` - Join groups
   - `/api/groups/[groupId]/leave` - Leave groups (new)
   - `/api/notifications` - GET/PATCH/DELETE

### Batch 1: Core Features

6. **Delete Marketplace Listings** ✅
7. **LiveKit Video/Audio Calls Integration** ✅
8. **Email Verification System** ✅
9. **Email Notifications** ✅
10. **Incoming Call Notifications** ✅
11. **Friends System** ✅
12. **Messaging System** ✅

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
| **Delete Own Listings** | ✅ Complete |
| Profile Screen | ✅ Complete |
| Hamburger Menu (All Pages) | ✅ Complete |
| **Friends System** | ✅ Complete |
| **Messaging** | ✅ Complete |
| **Video/Voice Call UI** | ✅ Complete |
| **Incoming Call Notifications** | ✅ Complete |
| **Deck Builder** | ✅ Complete |
| **Trades** | ✅ Complete |
| **Create Trades** | ✅ Complete |
| **Groups/Communities** | ✅ Complete |
| **Notifications** | ✅ Complete |
| **Wishlists** | ✅ Complete |
| **Push Notifications** | ✅ Complete |
| **Trade Reputation** | ✅ Complete |
| Settings | ⏳ Not started |

---

## NEXT STEPS

### High Priority (P1)
1. **Native Expo Build** - Required for full LiveKit video/audio and push notifications
2. **Group Chat** - Multi-user chat within communities
3. **Pokémon Card Prices** - Fix price display (TCGdex integration issue)

### Medium Priority (P2)
1. Settings mobile screen
2. Deck playtesting
3. Advanced deck format validation

---

## FILES REFERENCE

### New Files (This Session)
- `lib/push-notifications.ts` - Expo push notification service
- `app/api/push-tokens/route.ts` - Push token registration
- `app/api/reputation/route.ts` - Trade reputation API
- `mobile/hatake-mobile/src/hooks/usePushNotifications.ts` - Push notifications hook
- `mobile/hatake-mobile/src/screens/ReputationScreen.tsx` - Trade reputation UI
- `mobile/hatake-mobile/src/screens/WishlistScreen.tsx` - Wishlists UI
- `mobile/hatake-mobile/src/screens/CreateTradeScreen.tsx` - Trade creation flow
- `migrations/add_push_and_ratings.sql` - Database migration

### New Mobile Screens (Previous Session)
- `mobile/hatake-mobile/src/screens/DecksScreen.tsx` - Deck management
- `mobile/hatake-mobile/src/screens/TradesScreen.tsx` - Trade management
- `mobile/hatake-mobile/src/screens/GroupsScreen.tsx` - Community management
- `mobile/hatake-mobile/src/screens/NotificationsScreen.tsx` - Notification center

### Updated Backend APIs (Push Notifications)
- `app/api/friends/route.ts` - Push on friend request
- `app/api/messages/route.ts` - Push on new message
- `app/api/trades/route.ts` - Push on new trade
- `app/api/trades/[id]/route.ts` - Push on trade status change
- `app/api/wishlists/route.ts` - Bearer auth
- `app/api/wishlists/[wishlistId]/route.ts` - Bearer auth

---

*Last Updated: February 22, 2026*

4. **Friends System** ✅
   - Full Friends screen accessible from hamburger menu
   - Three tabs: Friends list, Pending Requests, Search/Find users
   - Send/Accept/Reject friend requests
   - Remove existing friends
   - Search users by name or email
   - Chat button to message friends directly

5. **Messaging System** ✅
   - Full messaging screen with conversations list
   - Real-time chat with friends
   - Message polling for updates (every 3 seconds)
   - Time formatting (today, yesterday, date)
   - Unread message badges

6. **Video/Voice Call UI** ✅
   - Audio and Video call buttons in chat header
   - Full-screen call interface
   - Call states: connecting, ringing, connected, ended
   - Call controls: mute, camera toggle, speaker, end call
   - Note: Full WebRTC streaming requires native build

---

## EMAIL SETUP GUIDE

### Resend Configuration
The platform uses **Resend** for transactional emails.

**Current Setup:**
- API Key: Configured in `.env` as `RESEND_API_KEY`
- Sender: `noreply@hatake.social`

**To use your own domain:**
1. Go to https://resend.com/domains
2. Add your domain (e.g., `hatake.social`)
3. Add the required DNS records (SPF, DKIM, DMARC)
4. Verify the domain
5. Update `SENDER_EMAIL` in `.env` to use your domain

**Email Types Sent:**
- Verification emails on signup
- Friend request notifications
- New message notifications  
- Reaction notifications

---

## KEY API ENDPOINTS

### Authentication
- `POST /api/auth/signup` - Register (sends verification email)
- `POST /api/auth/login` - Login
- `GET /api/auth/verify-email?token=` - Verify email
- `POST /api/auth/verify-email` - Resend verification email

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
| **Incoming Call Notifications** | ✅ Complete |
| Trading | ⏳ Not started |

---

## NEXT STEPS

### High Priority (P1)
1. **Native Expo Build** - For full LiveKit video/audio streaming
2. Trading functionality
3. Notifications display screen

### Medium Priority (P2)
1. Delete own marketplace listings
2. Create listings from collection
3. Screen sharing in calls

---

## FILES REFERENCE

### Email System
- `lib/email.ts` - Email service with Resend + templates
- `app/api/auth/verify-email/route.ts` - Verification API
- `app/verify-email/page.tsx` - Web verification page

### Mobile Screens
- `mobile/hatake-mobile/App.tsx` - Main app with modals + incoming call handler
- `mobile/hatake-mobile/src/screens/FriendsScreen.tsx` - Friends management
- `mobile/hatake-mobile/src/screens/MessagesScreen.tsx` - Messaging/Chat
- `mobile/hatake-mobile/src/screens/VideoCallScreen.tsx` - Voice/Video call UI
- `mobile/hatake-mobile/src/components/IncomingCallNotification.tsx` - Incoming call overlay

### Backend APIs (Updated)
- `app/api/auth/signup/route.ts` - Now sends verification email
- `app/api/friends/route.ts` - Now sends friend request email
- `app/api/messages/route.ts` - Now sends new message email
- `app/api/feed/[postId]/reactions/route.ts` - Now sends reaction email

---

## Environment Variables

```env
# Email (Resend)
RESEND_API_KEY=re_xxxxx
SENDER_EMAIL=noreply@hatake.social

# LiveKit (Video Calls)
LIVEKIT_URL=wss://xxxxx.livekit.cloud
LIVEKIT_API_KEY=xxxxx
LIVEKIT_API_SECRET=xxxxx
```

---

*Last Updated: February 22, 2026*
