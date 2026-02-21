# Hatake.Social Mobile App - Build & Testing Instructions

## Testing on Web Preview (Cloud Shell)

### Step 1: Navigate to the mobile app directory
```bash
cd /app/mobile/hatake-mobile
```

### Step 2: Start the web preview
```bash
npx expo start --web
```

### Step 3: Access the app
- The app will be available at: http://localhost:8081
- Use Cloud Shell's "Web Preview" feature on port 8081

### Test Credentials
- **Email:** test@test.com
- **Password:** password

---

## APK for Android Emulators

### Download APK
**Direct Download:** https://expo.dev/artifacts/eas/dTxeWN2gueqgCMnWbPRrby.apk

### Testing on Appetize.io
Note: Safari on iPad may have issues selecting APK files directly. Try these alternatives:

1. **Use a different browser** if available
2. **Copy the APK URL** and paste directly into Appetize.io's "Upload via URL" option
3. **Alternative emulators:** 
   - https://www.appetize.io (paste the APK URL directly)
   - https://app.browserstack.com/
   - https://www.lambdatest.com/mobile-app-testing

---

## API Configuration

The app connects to:
- **Backend API:** https://trade-board-2.preview.emergentagent.com

---

## Troubleshooting

### Web Preview Not Working
1. Make sure the backend is running (supervisor should handle this)
2. Check if port 8081 is accessible
3. Clear browser cache/localStorage

### Login Issues
- Ensure you're using the correct credentials
- Check the on-screen error messages
- The API URL is shown at the bottom of the login screen

---

## Building a New APK

```bash
cd /app/mobile/hatake-mobile
npx eas build --platform android --profile preview
```

The build takes approximately 5-10 minutes. Once complete, download the APK from the provided URL.
