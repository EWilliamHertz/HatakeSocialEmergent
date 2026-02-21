# How to Build Hatake.Social APK

## Option 1: EAS Build (Recommended - Builds in Cloud)

Run these commands in Google Cloud Shell:

```bash
# 1. Navigate to the mobile app directory
cd ~/HatakeSocialEmergent/mobile/hatake-mobile

# 2. Pull latest changes from GitHub
git pull origin main

# 3. Install dependencies
npm install

# 4. Make sure you're logged into EAS
eas login
# Use: ernst@hatake.eu

# 5. Build Android APK (builds on Expo's cloud servers)
eas build -p android --profile preview

# 6. When build completes, download the APK from the URL provided
```

## Option 2: Web Preview (No APK needed)

If you just want to test the app in a browser:

```bash
# 1. Navigate to the mobile app directory
cd ~/HatakeSocialEmergent/mobile/hatake-mobile

# 2. Install web dependencies
npm install
npx expo install react-dom react-native-web

# 3. Start web server
npx expo start --web

# 4. Press 'w' to open in browser
# Or visit the URL shown (usually http://localhost:8081)
```

## Option 3: Use Snack (Online IDE)

1. Go to https://snack.expo.dev
2. Create a new snack
3. Copy the code from this project
4. Run directly in browser or download APK

## Troubleshooting

### "Expo SDK < 41" error
The app is configured for SDK 52. Make sure package.json has:
```json
"expo": "~52.0.0"
```

### "Failed to resolve plugin" error
Run:
```bash
npm install
npx expo install --fix
```

### Build fails with dependency errors
Run:
```bash
rm -rf node_modules
rm package-lock.json
npm install
npx expo doctor --fix-dependencies
```

## After Build Succeeds

1. EAS will show: "Build successful!"
2. You'll see a download URL for the APK
3. Open that URL in Safari to download the APK
4. Share the APK to an Android device to install

## Important Files

- `app.json` - App configuration (name, icon, permissions)
- `eas.json` - Build configuration (APK vs AAB)
- `package.json` - Dependencies

## Your EAS Project

- Project ID: 00c4480b-bf3f-4e5b-a2b5-0eecbd89be00
- Owner: hatakehugo
- Slug: hatakesocial
