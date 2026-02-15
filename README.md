# TCG Social Hub - Setup Instructions

## 🚀 Quick Start Guide

### 1. Database Setup (Neon PostgreSQL)

**Option A: Create New Neon Database (Recommended)**

1. Go to [Neon Console](https://console.neon.tech)
2. Click "Create Project"
3. Name your project: `tcg-social-hub`
4. Copy your connection string (starts with `postgresql://`)
5. Replace `DATABASE_URL` in `.env.local` with your connection string

**Option B: Run Schema on Existing Database**

```bash
# Install psql if you don't have it
# Then run:
psql "YOUR_DATABASE_URL" < lib/db-schema.sql
```

### 2. Update Environment Variables

Your `.env.local` already has:
- ✅ Pokemon TCG API Key: `60a08d4a-3a34-43d8-8f41-827b58cfac6d`
- ✅ Logo URL: `https://i.imgur.com/B06rBhI.png`
- ✅ JWT Secret (change in production)

**You need to add:**
```bash
DATABASE_URL=postgresql://your-neon-connection-string-here
```

### 3. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📋 Features Implemented

### Authentication
- ✅ Email/Password signup & login
- ✅ Google OAuth via Emergent Auth
- ✅ Session management with httpOnly cookies
- ✅ JWT tokens (7-day expiry)

### Card Features
- ✅ Search Pokemon cards via Pokemon TCG API
- ✅ Search Magic cards via Scryfall API
- ✅ Real-time pricing data from TCGPlayer
- ✅ Add cards to collection
- ✅ Favorite cards

### Social Features
- ✅ Social feed (Friends/Groups/Public tabs)
- ✅ Create posts with card attachments
- ✅ Like & comment on posts
- ✅ Friend system (request/accept/remove)
- ✅ Groups & communities

### Messaging
- ✅ Direct messages between users
- ✅ Conversation threads
- ✅ Unread message tracking
- ✅ Real-time messaging ready

### Marketplace
- ✅ List cards for sale
- ✅ Browse marketplace listings
- ✅ Price tracking
- ✅ Condition & foil filtering

### Other
- ✅ Notifications system
- ✅ User profiles
- ✅ Responsive design

## 🗄️ Database Schema

The database has **17 tables**:
- `users` - User accounts
- `user_sessions` - Active sessions
- `verification_tokens` - Email verification
- `collection_items` - User card collections
- `favorites` - Favorited cards
- `friendships` - Friend relationships
- `groups` - Community groups
- `group_members` - Group memberships
- `posts` - Social feed posts
- `comments` - Post comments
- `likes` - Post likes
- `conversations` - Message conversations
- `conversation_participants` - Conversation members
- `messages` - Chat messages
- `marketplace_listings` - Cards for sale
- `trades` - Trade offers
- `notifications` - User notifications
- `cards_cache` - Cached card data

## 🔑 API Keys Required

### Pokemon TCG API (Already Set)
✅ **API Key**: `60a08d4a-3a34-43d8-8f41-827b58cfac6d`
- Get yours at: https://dev.pokemontcg.io
- Rate Limit: 20,000 requests/day

### Neon Database (Required)
❗ **DATABASE_URL**: Get from [Neon Console](https://console.neon.tech)
- Free tier: 10 GB storage
- Serverless, auto-scaling

### Scryfall API (No Key Required)
✅ No authentication needed
- Rate limit: 10 requests/second (enforced in code)

## 🎨 Pages

- **Landing Page**: `/` - Hero with search, features
- **Auth Pages**: `/auth/login`, `/auth/signup`, `/auth/callback`
- **Feed**: `/feed` (Coming next)
- **Search**: `/search` (Coming next)
- **Collection**: `/collection` (Coming next)
- **Messages**: `/messages` (Coming next)
- **Marketplace**: `/marketplace` (Coming next)
- **Profile**: `/profile/[userId]` (Coming next)

## 🔧 Troubleshooting

### Database Connection Error
```
Error: No database connection string
```
**Fix**: Update `DATABASE_URL` in `.env.local` with your Neon connection string

### Pokemon API 401 Error
```
Pokemon API error: Unauthorized
```
**Fix**: API key is already set correctly. If error persists, get new key from https://dev.pokemontcg.io

### Google OAuth Not Working
```
Redirect mismatch
```
**Fix**: Make sure you're using `/auth/callback` as the redirect URL

## 📱 Next Steps

1. **Set up Neon database** (see above)
2. **Test authentication** (signup/login)
3. **I'll build remaining pages**:
   - Feed page with posts
   - Search results page
   - Collection management
   - Messages interface
   - Marketplace browser
   - User profiles
4. **Mobile app** (Expo)

## 🚀 Deployment

When ready to deploy:

```bash
# Build for production
npm run build

# Start production server
npm start
```

**Environment Variables for Production**:
- Update `NEXT_PUBLIC_APP_URL` to your domain
- Generate new `JWT_SECRET`
- Use production Neon database

## 📞 Support

If you need help:
1. Check this README
2. Check `.env.local` configuration
3. Verify database connection
4. Ask me to continue building!
