# 📱 Capacitor iOS Setup Guide for HireMe

This guide walks you through the complete setup process for converting your HireMe Next.js app into an iOS app using Capacitor.

## ✅ What's Been Done

1. ✅ Installed Capacitor core packages (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`)
2. ✅ Initialized Capacitor configuration (`capacitor.config.ts`)
3. ✅ Added iOS platform to the project
4. ✅ Created entry point HTML file (`public/index.html`)
5. ✅ Updated `.gitignore` to exclude iOS build files
6. ✅ Added npm scripts for Capacitor commands

## 📋 Next Steps - Complete Setup

### Step 1: Update Capacitor Configuration

**File:** `capacitor.config.ts`

You need to update the production URL to point to your actual Vercel deployment:

```typescript
// In capacitor.config.ts, update this line:
url: 'https://your-app.vercel.app',  // Replace with your actual Vercel URL
```

**To find your Vercel URL:**
1. Go to your Vercel dashboard
2. Find your project
3. Copy the production URL (e.g., `https://hireme-app.vercel.app`)

### Step 2: Install Xcode (Required for iOS Development)

1. **Download Xcode from the Mac App Store** (it's free but large ~15GB)
2. **Open Xcode** and accept the license agreement
3. **Install Command Line Tools:**
   ```bash
   xcode-select --install
   ```
4. **Verify installation:**
   ```bash
   xcodebuild -version
   ```

### Step 3: Set Up Apple Developer Account

**For Testing on Your iPhone:**
- You can use your Apple ID (free) for development
- Go to: https://developer.apple.com/account
- Sign in with your Apple ID

**For App Store Submission:**
- You'll need a paid Apple Developer Program membership ($99/year)
- Sign up at: https://developer.apple.com/programs/

### Step 4: Open Project in Xcode

Run this command to open your iOS project in Xcode:

```bash
npm run cap:ios
```

Or manually:
```bash
npx cap open ios
```

### Step 5: Configure Xcode Project

Once Xcode opens:

1. **Select the Project** (left sidebar, "App" icon at the top)
2. **Select the "App" Target** (under TARGETS)
3. **Go to "Signing & Capabilities" tab:**
   - Check "Automatically manage signing"
   - Select your Team (your Apple ID)
   - Xcode will generate a Bundle Identifier (e.g., `com.hireme.app`)

4. **Update Bundle Identifier** (if needed):
   - Should match what's in `capacitor.config.ts` (`com.hireme.app`)

### Step 6: Configure App Settings

1. **App Display Name:**
   - In Xcode, go to the "App" target
   - Under "General" tab
   - Update "Display Name" to "HireMe"

2. **App Icons:**
   - In Xcode, find "AppIcon" in the left sidebar
   - Drag your app icons into the appropriate slots
   - You can use the icons from `public/` folder:
     - `favicon-16x16.png`
     - `favicon-32x32.png`
     - `apple-touch-icon.png`

3. **Splash Screen:**
   - Capacitor will use the default splash screen
   - You can customize it later in `ios/App/App/Assets.xcassets/LaunchImage.imageset`

### Step 7: Test on iOS Simulator

1. **Select a Simulator:**
   - At the top of Xcode, click the device selector
   - Choose an iPhone simulator (e.g., "iPhone 15 Pro")

2. **Run the App:**
   - Click the "Play" button (▶️) or press `Cmd + R`
   - Wait for the app to build and launch

3. **What to Expect:**
   - The app will open and load your Next.js app
   - In development mode, it will point to `http://localhost:3000`
   - **Important:** Make sure your Next.js dev server is running!

### Step 8: Test on Your iPhone (Physical Device)

1. **Connect Your iPhone** via USB to your Mac
2. **Trust the Computer** on your iPhone if prompted
3. **In Xcode:**
   - Select your iPhone from the device dropdown
   - Click "Play" to build and install

4. **On Your iPhone:**
   - Go to Settings > General > VPN & Device Management
   - Trust your developer certificate
   - The app should now launch

### Step 9: Configure for Production

**Update `capacitor.config.ts` for production:**

```typescript
server: {
  url: 'https://your-actual-vercel-url.vercel.app',
  cleartext: false,
}
```

**Build for Production:**

1. **Build your Next.js app:**
   ```bash
   npm run build
   ```

2. **Sync Capacitor:**
   ```bash
   npm run cap:sync
   ```

3. **In Xcode:**
   - Select "Any iOS Device" or "Generic iOS Device"
   - Go to Product > Archive
   - Wait for the archive to complete
   - Click "Distribute App"
   - Follow the wizard to upload to App Store Connect

## 🔧 Available Commands

```bash
# Sync web assets to iOS
npm run cap:sync

# Open iOS project in Xcode
npm run cap:ios

# Copy web assets only (faster than sync)
npm run cap:copy
```

## 📝 Important Notes

### Development vs Production

**Development Mode:**
- Capacitor points to `http://localhost:3000`
- You must have `npm run dev` running
- Great for testing and development

**Production Mode:**
- Capacitor points to your Vercel URL
- App works offline (cached)
- Better performance

### Switching Between Modes

To switch between development and production, update `capacitor.config.ts`:

```typescript
const isDev = process.env.NODE_ENV === 'development';
// or manually set:
const isDev = false; // for production
const isDev = true;  // for development
```

### Network Requirements

- **Development:** Requires your Mac and iPhone to be on the same network
- **Production:** App works anywhere with internet connection

## 🐛 Troubleshooting

### "Cannot find module" errors
```bash
cd ios/App
pod install
cd ../..
```

### Build errors in Xcode
1. Clean build folder: `Cmd + Shift + K`
2. Delete derived data: Xcode > Preferences > Locations > Derived Data > Delete
3. Rebuild: `Cmd + B`

### App won't load
- Check that your Next.js server is running (for dev mode)
- Verify the URL in `capacitor.config.ts`
- Check Xcode console for errors

### Signing errors
- Make sure you've selected your Team in Xcode
- Verify Bundle Identifier matches in both places
- Try cleaning and rebuilding

## 🚀 Next Steps After Setup

1. **Add Native Features:**
   - Camera access for profile photos
   - Push notifications
   - File system access
   - Biometric authentication

2. **Optimize for Mobile:**
   - Test all pages on mobile
   - Optimize images
   - Test offline functionality

3. **Prepare for App Store:**
   - Create app screenshots
   - Write app description
   - Set up App Store Connect
   - Submit for review

## 📚 Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Development Guide](https://developer.apple.com/ios/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

**Need Help?** Check the Capacitor docs or open an issue in your repository.
