# Hatake.Social - Native Expo Build Guide

## Prerequisites

1. **Node.js** 18+ installed
2. **Expo CLI**: `npm install -g expo-cli`
3. **EAS CLI**: `npm install -g eas-cli`
4. **Expo Account**: Register at https://expo.dev
5. **Android Studio** (for local builds) or use EAS Build (cloud)

---

## Step 1: Configure EAS Build

```bash
cd mobile/hatake-mobile

# Login to Expo
eas login

# Initialize EAS Build
eas build:configure
```

This creates an `eas.json` file. Update it:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "android": { "serviceAccountKeyPath": "./google-service-account.json" }
    }
  }
}
```

## Step 2: Update app.json

Ensure your `app.json` has correct config:

```json
{
  "expo": {
    "name": "Hatake.Social",
    "slug": "hatake-social",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1F2937"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1F2937"
      },
      "package": "com.hatake.social",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECORD_AUDIO",
        "NOTIFICATIONS"
      ],
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.hatake.social",
      "infoPlist": {
        "NSCameraUsageDescription": "Hatake.Social needs camera access for profile photos and media messages",
        "NSPhotoLibraryUsageDescription": "Hatake.Social needs photo library access to share images",
        "NSMicrophoneUsageDescription": "Hatake.Social needs microphone access for voice and video calls"
      }
    },
    "plugins": [
      "expo-image-picker",
      "expo-document-picker",
      "expo-av",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#3B82F6"
        }
      ]
    ]
  }
}
```

## Step 3: Environment Variables

Set your API URL for production:

```bash
# In your app's config.ts, the API_URL should point to your production server
# Option 1: Hardcode for production build
export const API_URL = 'https://your-production-url.com';

# Option 2: Use EAS environment variables
eas env:create --name API_URL --value https://your-production-url.com --environment production
```

## Step 4: Build APK (Testing)

```bash
# Build a preview APK for testing
eas build --platform android --profile preview

# This will output a download URL for the APK
# Install on your Android device for testing
```

## Step 5: Build Production AAB

```bash
# Build production Android App Bundle
eas build --platform android --profile production

# This creates an .aab file ready for Google Play Store
```

## Step 6: Features Requiring Native Build

These features ONLY work on native builds (not Expo Go or web):

| Feature | Status | Notes |
|---------|--------|-------|
| Push Notifications | Ready | Uses Expo Push API |
| Video/Audio Calls | Ready | Uses LiveKit (requires native modules) |
| Camera for Photos | Ready | expo-image-picker native |
| File Uploads | Ready | expo-document-picker native |
| Background Processing | Not yet | Needs expo-background-fetch |

## Troubleshooting

### Build fails with dependency errors
```bash
npx expo-doctor
npx expo install --fix
```

### Push notifications not working
1. Ensure `expo-notifications` plugin is in `app.json`
2. Get push token AFTER user grants permission
3. Test with Expo Push Notifications tool: https://expo.dev/notifications

### Video calls crash
- LiveKit requires native build, NOT Expo Go
- Ensure `@livekit/react-native` is installed
- Check camera/microphone permissions in `app.json`

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `eas build -p android --profile preview` | Build test APK |
| `eas build -p android --profile production` | Build production AAB |
| `eas build -p ios --profile production` | Build iOS IPA |
| `eas submit -p android` | Submit to Google Play |
| `eas submit -p ios` | Submit to App Store |
| `eas update` | OTA update (JS only) |

---

*Last Updated: February 22, 2026*
