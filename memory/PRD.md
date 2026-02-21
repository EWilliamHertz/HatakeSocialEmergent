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

## COMPLETED FEATURES - Session 2026-02-21

### Latest Features

1. **Hamburger Menu on All Pages** ✅
   - Menu button now appears in top-left of ALL screens:
     - Feed, Collection, Marketplace, Profile
   - Consistent navigation experience across the app

2. **Comment Reactions (Emoji)** ✅
   - Like, React buttons on every comment
   - Emoji picker: 👍 ❤️ 😂 😮 😢 🔥
   - Reactions display inline with count
   - Toggle reaction by tapping again
   - Works on both parent comments and replies

3. **View User Collections** ✅
   - Tap username in feed → View profile
   - "View Collection" button on profile
   - Tap card count in stats to view collection
   - Collection grid shows all user's cards
   - Anyone can view anyone's collection (social platform)

### Previous Features
- MTG Search with Edition Picker
- Feed Comments System (view, reply, add)
- Bulk Card Selection & Delete
- Profile Screen
- Euro currency prices

---

## KEY API ENDPOINTS

### Collection Management
- `GET /api/collection` - Get own collection
- `GET /api/users/{userId}/collection` - View user's collection
- `POST /api/collection` - Add card
- `DELETE /api/collection?id={id}` - Delete card

### Feed & Social
- `GET /api/feed` - Get posts with reactions
- `POST /api/feed/{postId}/comments` - Add comment
- `GET /api/feed/{postId}/comments` - Get comments

### Comment Reactions
- `POST /api/comments/{commentId}/reactions` - Toggle emoji reaction
- `GET /api/comments/{commentId}/reactions` - Get reactions

### User Profiles
- `GET /api/users/{userId}` - Get profile with stats

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
| Add Friend | ⏳ Placeholder |
| Messages | ⏳ Placeholder |
| Trading | ⏳ Not started |

---

## NEXT STEPS

### High Priority (P1)
1. Friends System (send/accept requests)
2. Messaging (friend-to-friend chat)
3. Trading functionality

### Medium Priority (P2)
1. Delete own marketplace listings
2. Create listings from collection
3. Push notifications

---

*Last Updated: February 21, 2026*
