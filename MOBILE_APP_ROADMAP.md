# Hatake.Social Mobile App Roadmap

## Executive Summary
This roadmap outlines the development plan for native mobile applications (iOS & Android) for Hatake.Social, the TCG trading platform. The goal is to bring the full trading experience to mobile users with optimized UX for on-the-go collection management, trading, and social features.

---

## Phase 1: Foundation & Planning (2-3 weeks)

### 1.1 Technology Stack Decision
**Recommended: React Native with Expo**
- Leverage existing React/TypeScript codebase knowledge
- Single codebase for iOS and Android
- Hot reloading for faster development
- Expo provides push notifications, camera access, and native modules

**Alternative: Flutter**
- Better performance for complex animations
- Growing ecosystem
- Would require learning Dart

### 1.2 Architecture Design
```
┌─────────────────────────────────────────┐
│           Mobile App (React Native)     │
├─────────────────────────────────────────┤
│  UI Layer (React Native Components)     │
├─────────────────────────────────────────┤
│  State Management (Redux/Zustand)       │
├─────────────────────────────────────────┤
│  API Layer (React Query / SWR)          │
├─────────────────────────────────────────┤
│  Native Features (Camera, Push, etc.)   │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│     Existing Backend (Next.js API)      │
│     - Same PostgreSQL Database          │
│     - Same Authentication (JWT)         │
│     - LiveKit for Video Calls           │
└─────────────────────────────────────────┘
```

### 1.3 Feature Prioritization for MVP
| Feature | Priority | Complexity |
|---------|----------|------------|
| Authentication (Email/Google) | P0 | Low |
| Collection Management | P0 | Medium |
| Card Search | P0 | Low |
| Marketplace Browse | P0 | Low |
| Card Scanner (Camera) | P0 | High |
| Trading System | P1 | Medium |
| Push Notifications | P1 | Medium |
| Messaging | P1 | Medium |
| Social Feed | P2 | Low |
| Video Calls | P2 | High |
| Deck Builder | P2 | Medium |

---

## Phase 2: MVP Development (6-8 weeks)

### 2.1 Core Authentication (Week 1)
- [ ] Email/password login
- [ ] Google Sign-In integration
- [ ] Secure token storage (Keychain/Keystore)
- [ ] Auto-login on app restart
- [ ] Biometric authentication (Face ID/Fingerprint)

### 2.2 Collection Management (Week 2-3)
- [ ] View collection with filtering
- [ ] Card detail view with images
- [ ] Manual card search and add
- [ ] Quantity and condition editing
- [ ] Collection value dashboard
- [ ] Sealed products view

### 2.3 Card Scanner Feature (Week 3-4)
**Key Mobile-Only Feature**
- [ ] Camera integration for card scanning
- [ ] Image recognition using:
  - Option A: On-device ML (TensorFlow Lite)
  - Option B: Cloud API (Google Vision / custom model)
- [ ] Match scanned card to Scryfall/TCGdex database
- [ ] Quick-add to collection workflow
- [ ] Bulk scanning mode

### 2.4 Marketplace (Week 4-5)
- [ ] Browse listings with infinite scroll
- [ ] Filter by game, price, condition
- [ ] Create listing from collection
- [ ] Percentage-based pricing (% of market value)
- [ ] Contact seller via messaging
- [ ] Bookmark/wishlist items

### 2.5 Basic Trading (Week 5-6)
- [ ] View incoming/outgoing trade offers
- [ ] Create new trade from collection
- [ ] Trade chat integration
- [ ] Trade status updates
- [ ] Rate completed trades

### 2.6 Push Notifications (Week 6-7)
- [ ] New trade offers
- [ ] Trade status changes
- [ ] New messages
- [ ] Price alerts for wishlist items
- [ ] Marketplace activity on your listings

### 2.7 Offline Support (Week 7-8)
- [ ] Local SQLite database for collection cache
- [ ] View collection offline
- [ ] Queue actions for sync when online
- [ ] Smart image caching

---

## Phase 3: Enhanced Features (4-6 weeks)

### 3.1 Social Features
- [ ] View social feed
- [ ] Create posts with card images
- [ ] Like and comment
- [ ] Follow users
- [ ] Friend requests

### 3.2 Messaging Enhancement
- [ ] Real-time chat with Socket.IO
- [ ] Image sharing in chat
- [ ] Quick reply from notification
- [ ] Message read receipts

### 3.3 Deck Builder
- [ ] View existing decks
- [ ] Create deck from search
- [ ] Deck analytics (mana curve, etc.)
- [ ] Share deck via link
- [ ] Import from clipboard

### 3.4 Video Calls (if prioritized)
- [ ] LiveKit SDK integration
- [ ] 1:1 video calls
- [ ] Picture-in-picture mode
- [ ] Screen share for deck review

---

## Phase 4: Polish & Launch (3-4 weeks)

### 4.1 Performance Optimization
- [ ] Image lazy loading and caching
- [ ] List virtualization for large collections
- [ ] API response caching
- [ ] Bundle size optimization

### 4.2 App Store Preparation
- [ ] App icons and splash screens
- [ ] App Store screenshots
- [ ] Privacy policy for app stores
- [ ] App Store Connect / Play Console setup
- [ ] Beta testing via TestFlight / Play Store Beta

### 4.3 Launch Checklist
- [ ] iOS App Store submission
- [ ] Google Play Store submission
- [ ] Marketing materials
- [ ] User documentation
- [ ] Support channels

---

## Technical Specifications

### API Compatibility
The mobile app will use the existing Next.js API endpoints:
```
/api/auth/* - Authentication
/api/collection/* - Collection management
/api/search/* - Card search (Scryfall/TCGdex)
/api/marketplace/* - Marketplace CRUD
/api/trades/* - Trading system
/api/messages/* - Messaging
/api/sealed/* - Sealed products
```

### Native Module Requirements
| Feature | iOS | Android |
|---------|-----|---------|
| Camera | AVFoundation | Camera2 API |
| Push Notifications | APNs | FCM |
| Biometrics | Face ID / Touch ID | Fingerprint / Face |
| Deep Links | Universal Links | App Links |
| Background Sync | BGTaskScheduler | WorkManager |

### Required API Keys & Services
- Apple Developer Account ($99/year)
- Google Play Developer Account ($25 one-time)
- Firebase (Push Notifications)
- Sentry or similar (Error tracking)

---

## Resource Requirements

### Team Composition
- 1 React Native Developer (full-time)
- 1 Backend Developer (part-time - API adjustments)
- 1 UI/UX Designer (for mobile-specific designs)
- 1 QA Tester (manual + automated)

### Infrastructure
- CI/CD pipeline (GitHub Actions / Expo EAS)
- Test devices (iPhone, Android phones)
- Staging environment for mobile testing

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Card scanner accuracy | Medium | High | Multiple ML models, manual fallback |
| App Store rejection | Low | Medium | Follow guidelines strictly, beta test |
| Performance on low-end devices | Medium | Medium | Aggressive optimization, minimum requirements |
| Feature parity delays | Medium | Low | MVP first, iterate |

---

## Success Metrics

### Launch Goals
- 1,000 downloads in first month
- 4.0+ star rating
- <2% crash rate
- <3 second cold start time

### Engagement Goals
- 50% weekly active users
- 10+ collection items added per user/month
- 5+ marketplace interactions per user/month

---

## Next Steps

1. **Immediate (This Week)**
   - Finalize technology stack decision (React Native recommended)
   - Set up React Native project with Expo
   - Create basic navigation structure

2. **Short Term (Month 1)**
   - Complete authentication flow
   - Implement collection viewing
   - Start card scanner POC

3. **Medium Term (Month 2-3)**
   - Complete MVP features
   - Internal testing and bug fixes
   - Prepare for beta launch

4. **Launch (Month 4)**
   - Beta testing with select users
   - App Store submission
   - Public launch

---

## Appendix: Screen Wireframes

### Collection Screen
```
┌─────────────────────────────┐
│ ← Collection    🔍  📷  ⚙️  │
├─────────────────────────────┤
│ [All] [MTG] [Pokemon]       │
├─────────────────────────────┤
│ Total Value: $2,450.00      │
│ 156 cards                   │
├─────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │Card │ │Card │ │Card │    │
│ │ Img │ │ Img │ │ Img │    │
│ └─────┘ └─────┘ └─────┘    │
│ Name     Name     Name      │
│ $15.00   $8.50    $22.00    │
├─────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │Card │ │Card │ │Card │    │
│ │ Img │ │ Img │ │ Img │    │
│ └─────┘ └─────┘ └─────┘    │
└─────────────────────────────┘
│   🏠    📦    💬    👤     │
└─────────────────────────────┘
```

### Card Scanner Screen
```
┌─────────────────────────────┐
│ ←  Scan Card               │
├─────────────────────────────┤
│                             │
│      ┌───────────────┐      │
│      │               │      │
│      │   📷 Camera   │      │
│      │    Preview    │      │
│      │               │      │
│      │  [Scanning...]│      │
│      └───────────────┘      │
│                             │
│  Position card in frame     │
│                             │
├─────────────────────────────┤
│ Recent Scans:               │
│ ┌────┐ ┌────┐ ┌────┐       │
│ │Img │ │Img │ │Img │       │
│ └────┘ └────┘ └────┘       │
└─────────────────────────────┘
```

---

*Last Updated: February 2026*
*Version: 1.0*
