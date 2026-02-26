# 🔧 iOS Simulator Connection Fix

## Issue
The iOS simulator shows a white screen with error: "Could not connect to the server"

## Root Cause
1. **Next.js server not running** - The app needs the dev server to be running
2. **localhost doesn't work in iOS simulator** - The simulator can't access `localhost` from your Mac

## Solution

### Step 1: Start Your Next.js Dev Server

Open a terminal and run:
```bash
npm run dev
```

Keep this terminal open and running!

### Step 2: Update Capacitor Config (Already Done ✅)

The config has been updated to use your Mac's IP address: `192.168.1.152:3000`

**Note:** If your IP address changes (different WiFi network), you'll need to update `capacitor.config.ts` with your new IP.

### Step 3: Sync and Rebuild

```bash
npm run cap:sync
npm run cap:ios
```

### Step 4: Run in Xcode

1. In Xcode, click the Play button (▶️)
2. The app should now connect to your dev server
3. You should see the mobile landing page!

## Finding Your IP Address

If you need to update the IP address later:

**Mac:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Or check System Settings:**
- System Settings > Network > WiFi > Details > IP Address

## Alternative: Use Network Hostname

Instead of IP address, you can also use your Mac's hostname:
```typescript
url: 'http://your-mac-name.local:3000',
```

## Troubleshooting

### Still can't connect?

1. **Check firewall:** Make sure your Mac's firewall allows connections on port 3000
2. **Check WiFi:** Make sure your Mac and iPhone simulator are on the same network
3. **Try different IP:** Your IP might have changed - run the ifconfig command again
4. **Check server is running:** Make sure `npm run dev` is running and shows "Ready on http://localhost:3000"

### For Production

When building for production, update `capacitor.config.ts`:
```typescript
const isDev = false; // Change to false
// And update the production URL:
url: 'https://your-actual-vercel-url.vercel.app',
```
