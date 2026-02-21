# Hatake.Social Mobile App - Native Build Guide

## Prerequisites
- Node.js 18+
- EAS CLI: `npm install -g eas-cli`
- Expo account with EAS access

## Building for Real Video/Audio Calls

The app includes LiveKit integration for real-time video/voice calls with screen sharing. To enable these features, you need to create a native build (not Expo Go).

### Step 1: Login to EAS
```bash
eas login
# Enter your credentials:
# Email: ernst@hatake.eu
# Password: [your password]
```

### Step 2: Create a Development Build
```bash
cd mobile/hatake-mobile

# For iOS (requires Mac with Xcode)
eas build --profile development --platform ios

# For Android
eas build --profile development --platform android

# For both platforms
eas build --profile development --platform all
```

### Step 3: Install on Device
Once the build is complete, you'll get a QR code or download link:
- **iOS**: Install via TestFlight or direct install (requires device registration)
- **Android**: Download and install the APK directly

### Step 4: Run with Development Server
```bash
# Start the dev server
npx expo start --dev-client

# Scan the QR code with your device running the development build
```

## Features Enabled in Native Build
- ✅ Real-time video calls (LiveKit WebRTC)
- ✅ Voice calls with HD audio
- ✅ Screen sharing
- ✅ Camera switching (front/back)
- ✅ Background audio
- ✅ Push notifications
- ✅ All Expo Go features

## eas.json Configuration
The project includes an `eas.json` with these profiles:
- `development`: Development build with dev client
- `preview`: Internal testing build
- `production`: App Store / Play Store release

## Environment Variables
For production builds, configure these in EAS:
```
EXPO_PUBLIC_API_URL=https://www.hatake.eu
```

## Troubleshooting

### "LiveKit not available" message
This means you're running in Expo Go. Create a development build to enable LiveKit.

### Camera/Microphone permissions
Make sure you've granted permissions when prompted. On iOS, check Settings > Hatake.Social.

### Build failures
1. Check that all dependencies are installed: `yarn install`
2. Clear cache: `expo prebuild --clean`
3. Check EAS build logs for specific errors

## Support
For issues with the native build, check:
- [Expo EAS Build docs](https://docs.expo.dev/build/introduction/)
- [LiveKit React Native docs](https://docs.livekit.io/realtime/client/react-native/)
