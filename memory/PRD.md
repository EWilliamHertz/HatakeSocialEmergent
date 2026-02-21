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

### Latest Features (Current Session)

1. **Delete Marketplace Listings** ✅ (Both Platforms)
   - Delete button visible on own listings
   - "My Listings" filter tab in mobile marketplace
   - Admin can delete any listing
   - Confirmation dialog before deletion
   - Mobile: Uses Bearer token auth

2. **LiveKit Video/Audio Calls Integration** ✅
   - Full LiveKit React Native SDK installed
   - Screen sharing support built-in
   - Call controls: mute, camera toggle, speaker, screen share
   - Graceful fallback in Expo Go (shows "native build required")
   - app.json configured with camera/microphone permissions
   - BUILD_GUIDE.md created with EAS build instructions

3. **Updated Call Screen Features** ✅
   - HD quality indicator when LiveKit is available
   - Screen share button during video calls
   - Better control labels and UI
   - LiveKit room connection on call accept

### Previous Session Features

4. **Email Verification System** ✅
   - Verification email sent on signup
   - 24-hour expiration on verification links
   - Web page for email verification (`/verify-email`)

5. **Email Notifications** ✅
   - Friend Requests, New Messages, Reactions
   - Beautiful HTML email templates

6. **Incoming Call Notifications** ✅
   - Global call listener
   - Visual overlay with Accept/Decline

7. **Friends System** ✅ (Mobile)
   - Search, Add, Accept, Remove friends
   - Three tabs: Friends, Requests, Search

8. **Messaging System** ✅ (Mobile)
   - Conversations list
   - Real-time chat with polling

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
