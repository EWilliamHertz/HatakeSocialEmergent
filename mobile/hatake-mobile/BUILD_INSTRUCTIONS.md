# Hatake.Social Mobile App - Quick Start Guide

## 🌐 OPTION 1: Web Preview (Recommended for your situation)

Since you're using Google Cloud Shell and Safari, here's the simplest way:

```bash
# In Google Cloud Shell:
cd ~/HatakeSocialEmergent/mobile/hatake-mobile

# Install dependencies (use --legacy-peer-deps if you get errors)
npm install --legacy-peer-deps

# Start web server
npx expo start --web --port 8080

# Cloud Shell will show you can preview on port 8080
# Click "Web Preview" button in Cloud Shell toolbar (top right)
# Select "Preview on port 8080"
```

## 🔧 OPTION 2: Fix dependency issues

If you get npm errors, run:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## 📱 OPTION 3: Build APK via EAS

```bash
cd ~/HatakeSocialEmergent/mobile/hatake-mobile
npm install --legacy-peer-deps
eas build -p android --profile preview
```

When build completes, EAS will give you a download link for the APK.

## 🎯 What the Mobile App Does

1. **Login Screen** - Sign in with email/password
2. **Collection** - View your card collection
3. **Marketplace** - Browse cards for sale
4. **Trades** - Manage trade offers
5. **Profile** - Your account settings
6. **Card Scanner** - Take photos to search cards

## 📋 Test Credentials

- Email: `test@test.com`
- Password: `password`

## 🔗 API Configuration

The app connects to: `https://trader-hub-61.preview.emergentagent.com`

This is your existing Hatake.Social backend.

## ❓ Troubleshooting

### "peer dependency" errors
Use: `npm install --legacy-peer-deps`

### "Cannot find module" errors
Run:
```bash
rm -rf node_modules
npm install --legacy-peer-deps
npx expo install --fix
```

### Web preview not loading
Make sure you're on port 8080:
```bash
npx expo start --web --port 8080
```

### EAS build fails
Check logs at the URL provided, common fixes:
- Run `npx expo doctor --fix-dependencies`
- Make sure app.json has correct projectId
