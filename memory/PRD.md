# Hatake.Social - TCG Trading Platform PRD

## Original Problem Statement
Create a comprehensive full-stack TCG (Trading Card Game) social platform with card management, marketplace, social features, and trading capabilities.

## Tech Stack

### Web Application
- Next.js 16+ with App Router
- TypeScript, Tailwind CSS, shadcn/ui
- PostgreSQL (Neon)
- LiveKit (video calls)
- Cloudinary (image storage)
- TCGdex API (Pokemon), Scryfall API (MTG)

### Mobile Application
- React Native with Expo
- React Navigation (Native Stack + Bottom Tabs)
- Zustand (State Management)
- Native fetch (API Client)

## Test Credentials
- **Test User**: test@test.com / password (admin)

---

## COMPLETED FEATURES - Session 2026-02-21

### Euro Currency Update
- All prices now display in € (Euro) across web and mobile
- MTG prices: Prefer EUR from Scryfall, convert USD at 0.92 rate
- Pokemon prices: Use cardmarket EUR prices
- Sealed products, marketplace, collection all use €

### Mobile App Fixes
1. **Feed Screen Fixed** - Usernames now display correctly, clickable profiles, working like button
2. **Pokemon Search Improved** - Added set code mapping (sv09, jtg, etc.), multiple search strategies
3. **MTG Search Fixed** - Now supports name, set code, and collector number searches
4. **Collection Value Stats** - Shows total value, MTG value, Pokemon value in €
5. **Card Sizes Fixed** - Collection (46% width, 140px height), Marketplace (46% width, 100px height)

### Web Marketplace Updates
1. **Shop Tab Added** - New tab showing shop products with product detail modal
2. **Gallery Support** - Product modal shows image gallery with thumbnails
3. **Seller Info Fixed** - Using seller_name/seller_picture fields correctly

### Admin Page Improvements
1. **Multi-Image Upload** - Can now select multiple gallery images at once
2. **Gallery Images Field** - Added to shop products database schema

---

## KEY API ENDPOINTS

### Shop Products
- `GET /api/shop` - Get active shop products (includes gallery_images)
- `POST /api/admin/products` - Create/update product (admin only)
- `DELETE /api/admin/products/{id}` - Delete product (admin only)

### Collection/Marketplace
- All prices now unified to EUR format

---

## DATABASE UPDATES

### shop_products table
- Added `gallery_images TEXT[]` column for product galleries

---

## TEST REPORTS
- Latest: `/app/test_reports/iteration_13.json`
- Mobile app syntax fixed (CollectionScreen.tsx)

---

## NEXT STEPS

### User Verification Needed
- Test marketplace Shop tab functionality
- Test multi-image gallery upload in admin
- Verify all prices display in € correctly
- Test mobile app search improvements

### High Priority (P1)
1. **Mobile App Phase 2:**
   - Implement Trades screen
   - Implement Friends screen
   - Implement Wishlists screen

2. **Mobile Shop Tab** - Add shop products to mobile marketplace

### Medium Priority (P2)
1. Mobile App real-time messaging
2. Push notifications for trade updates

### Future (P3)
- Card Recognition ML integration
- App store publishing

---

*Last Updated: February 21, 2026*
