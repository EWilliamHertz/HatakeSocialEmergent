# Hatake.Social - Google Play Store Deployment Guide

## Prerequisites

- Google Play Developer Account ($25 one-time fee): https://play.google.com/console
- Production AAB file (see EXPO_BUILD_GUIDE.md)
- App assets (screenshots, description, etc.)

---

## Step 1: Prepare Store Assets

### Required Screenshots
- **Phone:** Min 2, max 8 screenshots (1080x1920 recommended)
  - Home/Feed screen
  - Collection view
  - Marketplace
  - Trade details
  - Deck Builder
  - Messenger/Chat
  - Profile with badges
  - Dark mode view

### Required Graphics
- **Feature Graphic:** 1024x500 PNG/JPG (shown at top of store listing)
- **App Icon:** 512x512 PNG (32-bit, no alpha)

### App Information
- **Title:** Hatake.Social - TCG Trading Platform
- **Short Description (80 chars):** Trade, collect, and connect with TCG players worldwide
- **Full Description (4000 chars):**

```
Hatake.Social is the ultimate platform for Trading Card Game enthusiasts. Whether you play Magic: The Gathering or Pokemon TCG, we've got you covered.

KEY FEATURES:

Card Collection Management
- Search and add cards from MTG (Scryfall) and Pokemon (TCGdex)
- Track your collection with detailed card info, conditions, and values
- CSV import/export for easy migration
- Portfolio value tracking

Social Feed
- Share your pulls, deck builds, and collection updates
- Like, comment, and react to posts
- Join groups and communities
- Real-time messaging with friends

Marketplace
- List cards for sale with custom pricing
- Browse listings from other collectors
- Bulk list cards from your collection
- Sealed product tracking

Trading System
- Propose trades with other users
- Include cash + cards in trades
- Trade reputation and ratings
- Shipping and payment details

Deck Builder
- Build MTG and Pokemon decks
- Import decklists (MTGO format)
- Mana curve and deck analytics
- Format validation (Standard, Modern, Commander, etc.)
- Share decks with the community

Achievement Badges
- 26 unique badges to earn
- Trading, Collection, Social, and more categories
- Badge showcase on your profile and in feed

Video & Voice Calls
- Call friends directly from the app
- Discuss trades and deck builds face-to-face

Dark Mode
- Full dark mode support across all screens

Join thousands of TCG players on Hatake.Social today!
```

## Step 2: Create App in Google Play Console

1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in:
   - **App name:** Hatake.Social
   - **Default language:** English (or Swedish)
   - **App or Game:** App
   - **Free or Paid:** Free
4. Accept Developer Program Policies

## Step 3: Complete Store Listing

Navigate to **Grow > Store presence > Main store listing**:

1. Upload screenshots (phone + tablet if available)
2. Upload Feature Graphic
3. Add App Icon
4. Fill in descriptions
5. Select **Category:** Social
6. Add **Tags:** Trading Card Game, Card Collection, TCG, Pokemon, Magic

## Step 4: Content Rating

Navigate to **Policy > App content > Content rating**:

1. Start questionnaire
2. Answer honestly:
   - **Violence:** None
   - **Sexuality:** None  
   - **Language:** Mild (user-generated content)
   - **Controlled Substances:** None
   - **Miscellaneous:** Social interaction, user-generated content
3. Submit - expect rating: **Everyone** or **Everyone 10+**

## Step 5: Privacy Policy

Create a privacy policy page and host it (e.g., on your website):

**Required sections:**
- What data you collect (email, name, collection data)
- How you use data (platform functionality)
- Third-party services (Cloudinary, Neon, LiveKit)
- Data retention and deletion
- Contact information

**URL example:** `https://hatake.social/privacy`

## Step 6: App Access

If your app requires login:
1. Go to **Policy > App content > App access**
2. Select "All or some functionality is restricted"
3. Add test credentials:
   - **Email:** test@test.com
   - **Password:** password
   - **Instructions:** "Use these credentials to test all app features"

## Step 7: Target Audience & Ads

1. **Target age group:** 13+ (TCG audience)
2. **Contains ads:** No (unless you add them later)
3. **Appealing to children:** No

## Step 8: Upload AAB

Navigate to **Release > Production**:

1. Click "Create new release"
2. Upload your `.aab` file from EAS Build
3. Add release notes:
   ```
   Initial release of Hatake.Social!
   - Card collection management (MTG + Pokemon)
   - Social feed, messaging, and groups
   - Marketplace for buying/selling cards
   - Trading system with reputation
   - Deck Builder with analytics
   - Achievement badges (26 types)
   - Dark mode
   ```
4. Click "Review release"
5. Click "Start rollout to Production"

## Step 9: Review Process

- **Timeline:** 1-7 days (first submission may take longer)
- **Common rejection reasons:**
  - Missing privacy policy
  - Crash on launch
  - Missing test credentials
  - Incomplete store listing
  - Content rating mismatch

## Step 10: Post-Launch

### Monitor
- Check crash reports in Play Console
- Monitor user reviews and ratings
- Track install/uninstall rates

### Updates
```bash
# For JS-only changes (fast, no review):
eas update --branch production

# For native changes (requires review):
eas build -p android --profile production
# Then upload new AAB in Play Console
```

### Staged Rollout
- Start with 10% rollout
- Monitor for crashes/issues
- Gradually increase to 100%

---

## Checklist Before Submission

- [ ] Production AAB built and tested
- [ ] All screenshots uploaded (min 2)
- [ ] Feature graphic uploaded (1024x500)
- [ ] Short + full description written
- [ ] Content rating questionnaire completed
- [ ] Privacy policy URL added
- [ ] Test credentials provided
- [ ] Target audience configured
- [ ] Data safety section completed
- [ ] Release notes written
- [ ] API URL points to production server

---

## Cost Summary

| Item | Cost |
|------|------|
| Google Play Developer Account | $25 (one-time) |
| EAS Build (free tier) | $0 (30 builds/month) |
| EAS Build (production) | $99/month (unlimited) |
| Domain + hosting | Varies |

---

*Last Updated: February 22, 2026*
