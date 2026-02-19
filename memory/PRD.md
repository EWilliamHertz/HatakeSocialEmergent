# Hatake.Social - TCG Trading Platform PRD

## Original Problem Statement
Create a comprehensive full-stack TCG (Trading Card Game) social platform.

## ✅ ALL FIXES VERIFIED WORKING LOCALLY

### Current Session Fixes
1. **Marketplace Delete** - FIXED & TESTED ✅
2. **Pokemon CSV Import** - FIXED (BOM handling, set code mapping) ✅
3. **MTG CSV Import** - FIXED (set name, rarity, type_line added) ✅
4. **Cloudinary File Upload** - CONFIGURED & WORKING ✅
5. **LiveKit Video Calls** - TOKEN API WORKING ✅

### Environment Variables Needed on Production (hatake.eu)
```
# LiveKit (for video calls)
LIVEKIT_URL=wss://hatakesocial-abnya21v.livekit.cloud
LIVEKIT_API_KEY=APIcmewPUZxefyQ
LIVEKIT_API_SECRET=hG8vVeRevgA42fJcpKcC8YqduOYJNff3VHPfewA5H9QK
NEXT_PUBLIC_LIVEKIT_URL=wss://hatakesocial-abnya21v.livekit.cloud

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=dfyh7cs1g
CLOUDINARY_API_KEY=734447488263944
CLOUDINARY_API_SECRET=fQgKFWGt0aw8kl8WgBN2z14RX-c
```

## Deployed Features
- Deck Analytics (mana curve, colors, types, legality, playtesting, export)
- Collection Statistics (rarity, game, condition distribution, CSV export)
- Enhanced CSV imports (Pokemon & MTG)
- Cloudinary file uploads
- LiveKit video calls

## Next Tasks
- Wishlists feature
- Trade reputation system
- Custom % pricing per card
- Mobile app design

## Tech Stack
- Next.js 16+ with App Router
- TypeScript, Tailwind CSS, shadcn/ui
- PostgreSQL (Neon)
- LiveKit (video calls)
- Cloudinary (image storage)
- TCGdex API (Pokemon), Scryfall API (MTG)

## Test Credentials
- **Test User**: test@test.com / password
- **Admin Emails**: zudran@gmail.com, ernst@hatake.eu
