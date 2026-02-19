# Hatake.Social - Suggestions & Improvements Roadmap

## Executive Summary
Hatake.Social is a feature-rich TCG social platform. Below are prioritized suggestions for enhancements, optimizations, and new features that would elevate the user experience and business value.

---

## 🔴 Critical Issues to Address First

### 1. WebSocket/Video Calls on Vercel
**Problem:** Vercel's serverless architecture doesn't support persistent WebSocket connections (10-second timeout).

**Solutions:**
- **Option A (Recommended):** Deploy the FastAPI backend separately on Railway/Render/Fly.io ($5-7/month) for WebSocket support
- **Option B:** Use Vercel-compatible real-time services:
  - **Pusher** - Easy integration, free tier available
  - **Ably** - More features, competitive pricing
  - **Liveblocks** - Great for collaborative features
- **Option C:** Replace WebRTC with a managed video service:
  - **Daily.co** - Simple API, WebRTC abstracted
  - **Vonage/Twilio** - Enterprise-grade

### 2. Existing Cards Missing Rarity Data
- Cards already in the database may have `rarity: null` or `Unknown`
- Consider a migration script to re-fetch and update card data from APIs

---

## 🟡 P1 - High Priority Improvements

### 1. Collection Enhancements
- **Find Duplicates Feature:** Identify cards with quantity > 1 for trading/selling
- **Collection Statistics:** Total cards, total value, rarity distribution, type breakdown
- **Wishlists:** Allow users to create want-lists that others can see
- **Price Alerts:** Notify when a card in collection rises/drops in value
- **Export Collection:** Generate CSV/PDF of collection for insurance/records

### 2. Trade System Improvements
- **Trade Reputation System:** Rate trades, show user trustworthiness
- **Trade History:** View past completed trades
- **Pending Trade Notifications:** More prominent alerts for pending trades
- **Counter-Offer Flow:** Allow modifying trades instead of reject/accept only
- **Trade Templates:** Save common trade structures

### 3. Marketplace Enhancements
- **Saved Searches:** Get notified when matching listings appear
- **Price History:** Show historical prices for cards
- **Bulk Listing:** List multiple cards at once with same settings
- **Shipping Calculator:** Estimate shipping costs based on location
- **Seller Ratings:** Allow buyers to rate sellers

### 4. Deck Builder Improvements
- **Mana Curve Visualization:** Chart showing mana distribution
- **Color Pie Distribution:** Visual breakdown of colors in deck
- **Card Type Breakdown:** Creatures, spells, lands, etc.
- **Legal Format Validation:** Check if deck is Standard/Modern/Commander legal
- **Import/Export Decks:** Support popular formats (MTGA, Archidekt)
- **Deck Playtesting:** Draw sample hands, goldfish

---

## 🟢 P2 - Medium Priority Features

### 1. Social Features
- **User Profiles V2:**
  - Achievement badges
  - Trading stats
  - Favorite formats/games
  - LGS (Local Game Store) affiliation
- **Activity Feed Improvements:**
  - Filter by type (trades, listings, posts)
  - Mute/follow specific users
- **Direct Trade Links:** Share link that opens trade with specific cards pre-filled
- **Group Events:** Schedule play sessions, release events

### 2. Mobile Experience
- **Progressive Web App (PWA):** Installable, works offline for viewing collection
- **Camera Card Scanner:** Use phone camera to add cards via image recognition
- **Push Notifications:** Real-time alerts for messages, trades, listings

### 3. Admin & Moderation
- **Content Moderation Queue:** Review reported posts/listings
- **Analytics Dashboard:** User growth, transaction volume, popular cards
- **Featured Listings:** Promote certain marketplace items
- **Announcement System:** Site-wide banners for news/events

---

## 🔵 P3 - Future Enhancements

### 1. Monetization Features
- **Premium Membership:**
  - Advanced analytics
  - No listing fees
  - Priority customer support
  - Exclusive badge
- **Promoted Listings:** Pay to boost marketplace visibility
- **Shop Integration:** Stripe/PayPal for official merchandise

### 2. Sealed Product Support
- **Sealed Inventory:** Track booster boxes, bundles, ETBs
- **Sealed Market Value:** Track sealed product prices
- **Opening Simulator:** Virtual pack opening experience

### 3. Event & Tournament System
- **Tournament Brackets:** Swiss, single elimination
- **League Play:** Ongoing point-based competitions
- **Prize Support:** Distribute digital prizes/badges
- **Event Calendar:** Community events, release dates

### 4. API & Integrations
- **Public API:** Allow third-party apps to access collection data
- **Discord Bot:** Commands for price checks, trade notifications
- **Twitch Extension:** Overlay showing streamer's collection

---

## 🛠 Technical Improvements

### Performance
- [ ] Implement virtual scrolling for large collections (1000+ cards)
- [ ] Lazy load card images with blur placeholders
- [ ] Implement Redis caching for hot data (price lookups)
- [ ] Optimize database queries with proper indexing

### SEO & Accessibility
- [ ] Server-side rendering for public pages (profile, marketplace)
- [ ] Meta tags for social sharing
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility

### Security
- [ ] Rate limiting on all API endpoints
- [ ] Input validation/sanitization
- [ ] Security headers (CSP, HSTS)
- [ ] Regular dependency audits

### Code Quality
- [ ] Unit tests for critical business logic
- [ ] E2E tests for main user flows
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Error monitoring (Sentry integration)

---

## 📱 Mobile App Roadmap

### Phase 1 - PWA (2-3 weeks)
- Convert to installable PWA
- Offline collection viewing
- Push notification support

### Phase 2 - React Native (6-8 weeks)
- Native iOS/Android apps
- Camera card scanning (using ML/card recognition API)
- Biometric authentication
- Native push notifications

### Phase 3 - Advanced Features
- AR card viewing
- NFC tag support for physical-digital linking
- Apple/Google Wallet integration

---

## Quick Wins (Can implement today)

1. ✅ Fix Pokemon rarity showing as "Unknown" - **DONE**
2. ✅ Improve Pokemon CSV import with set code mapping - **DONE**
3. ⬜ Add loading skeletons instead of spinners
4. ⬜ Add "Recently Viewed" cards section
5. ⬜ Implement "Share Collection" public link
6. ⬜ Add keyboard shortcuts (J/K to navigate, E to edit)
7. ⬜ Dark mode persistence across sessions

---

## Revenue Potential Analysis

| Feature | Implementation Effort | Revenue Potential |
|---------|----------------------|-------------------|
| Premium Membership | Medium | High (€5-10/month) |
| Promoted Listings | Low | Medium (€0.50-2/listing) |
| Transaction Fees | Low | Medium (2-5% of sales) |
| Official Shop | Medium | Medium-High |
| Sponsored Content | Low | Low-Medium |

---

*Last Updated: February 2026*
*Contact: ernst@hatake.eu*
