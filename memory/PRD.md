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

### Session 9 Updates - Mobile Fixes & Dark Mode (2026-02-22)

1. **Mobile Feed Group Filtering Fix** ✅
   - Feed now passes `group_id` to API when filtering by group
   - Posts are correctly filtered per group instead of showing all posts

2. **Trade Details Enhancement** ✅
   - Trade detail view now shows individual card information
   - Displays card name, set, finish type for each card
   - Shows card value in euros (€) when available
   - Proper card thumbnail images

3. **Dark Mode Settings** ✅
   - Added dark mode toggle in Settings screen
   - Sound enabled toggle in Settings
   - Settings persist to localStorage (web) / AsyncStorage (native)

4. **Profile → Settings Navigation** ✅
   - Settings menu item now navigates to Settings screen

5. **Web Chat Auto-Scroll Fix** ✅
   - Chat scrolls to bottom when opened
   - Does NOT force scroll when user is reading history
   - Smart detection of user scroll position

6. **Mobile Messages Screen Fix** ✅
   - Applied web-specific rendering (absolute View instead of Modal)
   - Should resolve the blank screen issues on Expo web

### Session 8 Updates - Notification Sounds & Message Replies (2026-02-22)

1. **Notification Chime Sound** ✅
   - Web: Uses Web Audio API to play a pleasant two-note chime
   - Mobile: Uses expo-av with synthesized audio
   - Sound toggle available in Messages page header
   - Plays when new unread messages arrive

2. **Message Reply Feature** ✅
   - Long-press (mobile) or click reply button (web) to reply to a message
   - Reply banner shows above input when replying
   - Messages display reply context with quoted text
   - API updated to support `reply_to` field
   - Works in MessagesScreen, MessengerWidget, and web Messages page

3. **Mobile Trades Screen Rewrite** ✅
   - Completely rewrote TradesScreen with simpler ScrollView approach
   - Removed FlatList to avoid web rendering issues
   - Uses standard View hierarchy for better Expo web compatibility

### Session 7 Updates - Critical Fixes & Media Upload (2026-02-22)

1. **Web Group Invitations Fix** ✅
   - Fixed authentication issue in `/api/groups/invites/route.ts`
   - Changed from `getSessionUser` to `getUserFromRequest` for proper JWT auth
   - Invites API now works correctly with PUT/POST requests

2. **Messenger Photo/Video Upload** ✅
   - Added ImagePicker integration for both MessengerWidget and MessagesScreen
   - Users can now send images and videos in chats
   - Media buttons added to message input area
   - Upload progress indicator when sending media
   - Media messages display inline in chat

3. **MessengerWidget Conversation Fix** ✅
   - Fixed API to include `conversation_id` in conversation list
   - Updated `fetchMessages` to use `conversation_id` properly
   - Messages now load correctly when clicking into a conversation

4. **Mobile Trades Screen Enhancement** ✅
   - Added mounted state check to prevent state updates after unmount
   - Added flex/display styles to parent container for web
   - Wrapped content in additional View for better web compatibility

5. **Messages API Enhancement** ✅
   - Added `conversation_id` to the GET conversations response
   - Supports `messageType` and `mediaUrl` for media messages

### Session 6 Updates - Bug Fixes (2026-02-22)

1. **Sealed Products Currency Fix** ✅
   - Fixed currency inconsistency in Add/Edit modal
   - Both "Purchase Price" and "Current Value" now show € (was showing $ for Current Value)

2. **Friend Requests Web Improvements** ✅
   - Added proper error handling and feedback for friend request actions
   - Added dark mode support to Requests tab and Search tab
   - Added test IDs for Accept/Decline/Add Friend buttons
   - Alert messages now show success/failure status

3. **Mobile Trades Screen Fix** ✅
   - Applied web-specific rendering fix (absolute View instead of Modal on web)
   - This addresses the "flash then white" issue on Expo web build

4. **Mobile MessengerWidget Fix** ✅
   - Fixed FlatList rendering with proper flex styling
   - Added z-index to chat window for proper layering
   - Wrapped FlatList in View with flex: 1 for proper sizing

5. **Mobile GroupsScreen Styles** ✅
   - Added missing invite-related styles (inviteCard, inviteHeader, etc.)
   - Fixed emptySubtext style that was missing

6. **Mobile FeedScreen Type Fix** ✅
   - Added group_id and group_name to Post interface

### Session 5 Updates - UI Improvements & Marketplace (2026-02-22)

1. **Feed Group Badge** ✅
   - Posts now show "@ GROUP_NAME" badge when posted to a group
   - Both web and mobile display the group affiliation
   - Blue badge styling for clear visibility

2. **Messenger Widget Fixed** ✅
   - Fixed API endpoint (was calling non-existent `/api/messages/conversations`)
   - Now correctly fetches from `/api/messages` endpoint

3. **Collection Card Display Enhanced (Mobile)** ✅
   - Added set code and collector number display
   - Foil/Holo overlay effects for special cards
   - Pokeball/Masterball finish indicators
   - Visual badge for card finish type
   - Quantity badge styling improved

4. **Marketplace "Hatake Products" Tab** ✅
   - New second tab showing official Hatake products
   - Tab labels: "Card Listings" | "Hatake Products"
   - Mobile marketplace now has same dual-tab layout
   - Shop products from admin/shop displayed
   - Stock indicators (low stock, sold out)
   - "Official Hatake" verification badge

### Session 4 Updates - Bug Fixes & Enhancements (2026-02-21)

1. **Feed Groups Tab Fixed (Web + Mobile)** ✅
   - Fixed API field mismatch (was expecting 'myGroups' but API returns 'groups')
   - Group selector dropdown now works correctly
   - Can create posts to specific groups
   - Feed POST API accepts both 'group_id' and 'groupId' for backwards compatibility

2. **CSV Import for Collection (Mobile)** ✅
   - New CSV import modal accessible from collection header
   - Supports multiple CSV formats:
     - `set_code, collector_number, quantity`
     - Space-separated format
   - Game selector (MTG/Pokemon)
   - Progress tracking during import
   - Import log with success/failure status
   
3. **Pokémon Card Limit Increased** ✅
   - Changed from 20 to 100 cards max per search
   - Matches Magic: The Gathering search limits

4. **Enhanced Deck Builder (Mobile)** ✅
   - Two tabs: "My Decks" | "Community Decks"
   - Game filters (All, MTG, Pokemon)
   - Format filters (Standard, Modern, Commander, etc.)
   - Mana curve visualization for MTG decks
   - Copy community decks to your collection
   - Create decks with name, game, format, description, visibility

5. **Copy Deck API** ✅
   - New endpoint: POST /api/decks/{deckId}/copy
   - Copies all cards from original deck
   - Creates private copy for the user

### Session 3 Updates - Group Chat, Settings, Feed Groups

1. **Group Chat (Web + Mobile)** ✅
   - Full chat functionality within groups
   - Real-time message polling
   - Push notifications to group members
   - `/api/groups/[groupId]/messages` endpoint

2. **Settings Screen Enhanced (Web + Mobile)** ✅
   - Swedish payment fields: Swish, Clearing, Kontonummer
   - International payment: IBAN, BIC/SWIFT
   - Shipping address
   - All fields saved to user profile

3. **Feed Groups Tab Improved (Web + Mobile)** ✅
   - Dropdown to select specific group
   - Post directly to a group
   - Group posts visible to members only

4. **Notification Icon (Mobile)** ✅
   - Top-right notification bell now opens NotificationsScreen

5. **Collection Modal Menu (Mobile)** ✅
   - Hamburger menu available in Add Card modal

6. **Pokémon Card Prices Fixed** ✅
   - TCGdex pricing now correctly parsed from `pricing.cardmarket.avg`

### Session 2 Updates - Push Notifications & Trading Reputation

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
| **Group Chat** | ✅ Complete |
| **Notifications** | ✅ Complete |
| **Wishlists** | ✅ Complete |
| **Push Notifications** | ✅ Complete |
| **Trade Reputation** | ✅ Complete |
| **Settings** | ✅ Complete |
| Pokémon Card Prices | ✅ Fixed |

---

## NEXT STEPS

### High Priority (P1)
1. **Native Expo Build** - Required for push notifications and video calls to work on device
2. **Google Play Store Deployment** - Guide the user through publishing

### Medium Priority (P2)
1. Deck playtesting features
2. Advanced deck format validation
3. Price alerts and notifications

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
