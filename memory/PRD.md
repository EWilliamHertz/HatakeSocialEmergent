# Hatake.Social - TCG Trading Platform PRD

## Original Problem Statement
Create a comprehensive full-stack TCG (Trading Card Game) social platform with card management, marketplace, social features, and trading capabilities.

## Tech Stack
- Next.js 16+ with App Router
- TypeScript, Tailwind CSS, shadcn/ui
- PostgreSQL (Neon)
- LiveKit (video calls)
- Cloudinary (image storage)
- TCGdex API (Pokemon), Scryfall API (MTG)

## Test Credentials
- **Test User**: test@test.com / password (admin)
- **Admin Users**: zudran@gmail.com, ernst@hatake.eu, ewilliamhe@gmail.com

---

## COMPLETED FEATURES

### Session 2026-02-19 (Latest)

1. **Sealed Product Management** ✅
   - Full CRUD for Pokemon and MTG sealed products
   - Track booster boxes, ETBs, tins, bundles, etc.
   - Investment tracking (purchase price, current value, profit/loss)
   - Stats dashboard with total invested, current value, and ROI
   - Filter by game type
   - UI at `/sealed`

2. **Deck Builder Import/Export Enhancements** ✅
   - Import supports multiple formats:
     - MTGA: `4 Lightning Bolt`
     - Archidekt: `1x Card Name (SET) 123` or `[SET]`
     - Commander: `Commander: Card Name`
     - Sideboard: `SB: 4 Card Name` or `Sideboard` section
   - Export in three formats:
     - MTG Arena Format (with set codes)
     - Archidekt Format
     - Plain Text

3. **Deck Analytics** ✅
   - Mana Curve visualization (bar chart)
   - Color Distribution (pie chart with mana pip counts)
   - Card Type Breakdown (Creature, Instant, etc.)
   - Format Legality Validation
   - Playtesting (draw sample hands, goldfish mode)

4. **Deck Format Validation** ✅
   - MTG Formats: Standard, Modern, Legacy, Vintage, Pioneer, Commander, Pauper, Draft, Sealed
   - Pokemon Formats: Standard, Expanded, Legacy, Unlimited
   - Validates deck size, card copy limits, basic land rules

5. **Individual Card Sale Pricing** ✅
   - Set card prices as percentage of market value
   - API calculates final price from percentage
   - Marketplace listing shows calculated price

6. **Database Migration Updates** ✅
   - Added `sealed_products` table
   - Added `price_percentage` column to `marketplace_listings`

7. **Mobile App Roadmap** ✅
   - Created comprehensive roadmap at `/app/MOBILE_APP_ROADMAP.md`
   - 4-phase development plan
   - Technology recommendation (React Native with Expo)
   - Feature prioritization for MVP
   - Resource requirements and timeline

### Previous Session
- Database migration: `wishlists`, `wishlist_items`, `trade_ratings` tables
- Wishlists feature (full CRUD)
- Trade Reputation system
- Marketplace Delete fix
- LiveKit Video Calls (user confirmed working)
- Cloudinary Image Upload (user confirmed working)

---

## DATABASE SCHEMA

### New Tables (2026-02-19)
```sql
-- Sealed Products
sealed_products (
  product_id, user_id, name, game, product_type, 
  set_name, set_code, language, quantity,
  purchase_price, current_value, purchase_date, 
  notes, image_url, created_at, updated_at
)

-- Updated: marketplace_listings
+ price_percentage INTEGER  -- % of market value (e.g., 90 = 90%)
```

---

## KEY API ENDPOINTS

### Sealed Products
- `GET /api/sealed` - List sealed products (with optional `?game=` filter)
- `POST /api/sealed` - Add sealed product
- `GET /api/sealed/[productId]` - Get product details
- `PATCH /api/sealed/[productId]` - Update product
- `DELETE /api/sealed/[productId]` - Delete product

### Marketplace (Updated)
- `POST /api/marketplace` - Create listing with optional `pricePercentage` field

---

## NAVIGATION
Main nav includes: Feed, Search, Collection, Decks, **Sealed**, Market, Trades, Wishlists, Community, Messages

---

## TEST REPORTS
- Latest: `/app/test_reports/iteration_11.json` - All 23 tests passed

---

## MOBILE APP ROADMAP SUMMARY

**Location**: `/app/MOBILE_APP_ROADMAP.md`

### Phases:
1. **Foundation (2-3 weeks)**: Tech stack, architecture, feature prioritization
2. **MVP (6-8 weeks)**: Auth, Collection, Card Scanner, Marketplace, Trading, Push Notifications
3. **Enhanced (4-6 weeks)**: Social features, Messaging, Deck Builder, Video Calls
4. **Launch (3-4 weeks)**: Performance optimization, App Store submission

### Key Mobile-Only Feature:
- **Card Scanner**: Camera-based card recognition for quick collection adds

### Tech Recommendation:
- React Native with Expo (leverages existing React/TypeScript skills)

---

## UPCOMING TASKS

None remaining from user's request. All items completed:
- ✅ Sealed product management (Pokemon + MTG)
- ✅ Deck Builder Import/Export (MTGA, Archidekt)
- ✅ Deck Builder Playtesting
- ✅ Individual card sale pricing (% of market)
- ✅ Deck format validation (MTG + Pokemon)
- ✅ Mobile app roadmap

---

*Last Updated: February 19, 2026*
