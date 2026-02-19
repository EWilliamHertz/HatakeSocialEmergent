# Hatake.Social Mobile App

A React Native mobile application for the Hatake.Social TCG trading platform.

## Features

### MVP Features
- **Authentication**: Email/password login and registration
- **Collection Management**: View, add, edit, and remove cards from your collection
- **Card Search**: Search for MTG and Pokémon cards from Scryfall/TCGdex
- **Card Scanner**: Camera-based card recognition for quick collection adds
- **Marketplace**: Browse and create listings to buy/sell cards
- **Trading System**: Create and manage card trades with other users
- **Push Notifications**: Stay updated on trades, messages, and price alerts

### Tech Stack
- **Framework**: React Native with Expo
- **Navigation**: React Navigation (Native Stack + Bottom Tabs)
- **State Management**: Zustand
- **API Client**: Axios
- **Storage**: Expo SecureStore for tokens, AsyncStorage for data
- **Camera**: Expo Camera for card scanning
- **Icons**: @expo/vector-icons (Ionicons)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Navigate to mobile directory
cd /app/mobile/hatake-mobile

# Install dependencies
npm install

# Start the development server
npm start
```

### Running on Devices

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web (for testing)
npm run web
```

### Using Expo Go
1. Install Expo Go on your phone
2. Scan the QR code from the terminal
3. The app will load on your device

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Button.tsx
│   ├── CardItem.tsx
│   ├── GameFilter.tsx
│   └── SearchBar.tsx
├── navigation/       # Navigation configuration
│   └── AppNavigator.tsx
├── screens/          # Screen components
│   ├── LoginScreen.tsx
│   ├── CollectionScreen.tsx
│   ├── SearchScreen.tsx
│   ├── MarketplaceScreen.tsx
│   ├── TradesScreen.tsx
│   ├── ProfileScreen.tsx
│   └── ScannerScreen.tsx
├── services/         # API services
│   ├── api.ts        # Axios instance
│   ├── auth.ts       # Authentication
│   ├── collection.ts # Collection API
│   ├── search.ts     # Card search
│   ├── marketplace.ts # Marketplace API
│   ├── trades.ts     # Trades API
│   └── config.ts     # API configuration
├── store/            # Zustand state management
│   └── index.ts
├── types/            # TypeScript types
└── utils/            # Utility functions
```

## API Configuration

Update `src/services/config.ts` with your backend URL:

```typescript
export const API_BASE_URL = 'https://your-api-url.com';
```

## Card Scanner

The card scanner feature currently uses a text-based search as a fallback. For production, integrate with a card recognition API:

### Recommended APIs
1. **Google Cloud Vision** - OCR for card name detection
2. **AWS Rekognition** - Image classification
3. **Custom ML Model** - Train on card images using TensorFlow

## Building for Production

### iOS
```bash
# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### Android
```bash
# Build for Android
eas build --platform android

# Submit to Play Store
eas submit --platform android
```

## Environment Variables

Create an `.env` file:

```
API_BASE_URL=https://your-api.com
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test on both iOS and Android
4. Submit a pull request

## License

Private - Hatake.Social © 2026
