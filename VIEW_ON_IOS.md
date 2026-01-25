# How to View Your Website on iOS Simulator

## Quick Steps:

### 1. Start Your Next.js Development Server
```bash
cd /Users/catherinefratila/Desktop/hireme
npm run dev
```
Your server will start at `http://localhost:3000`

### 2. Open iOS Simulator

**Option A: From Terminal (Fastest)**
```bash
open -a Simulator
```

**Option B: From Xcode**
- Open Xcode
- Go to **Xcode → Open Developer Tool → Simulator**

### 3. Access Your Website in the Simulator

**Important:** iOS Simulator can't access `localhost` directly. Use one of these:

**Option 1: Use your Mac's local network IP** (Recommended)
1. Find your Mac's IP address:
   ```bash
   ipconfig getifaddr en0
   ```
   Or check System Settings → Network

2. In Safari on the iOS Simulator, navigate to:
   ```
   http://YOUR_MAC_IP:3000
   ```
   Example: `http://192.168.1.100:3000`

**Option 2: Use a special hostname**
- Try: `http://host.docker.internal:3000` (if using Docker)
- Or: `http://127.0.0.1:3000` (sometimes works)

**Option 3: Deploy and test on real device**
- Push to Vercel
- Access the live URL from your iPhone's Safari

## Full Command Sequence:

```bash
# Terminal 1: Start dev server
cd /Users/catherinefratila/Desktop/hireme
npm run dev

# Terminal 2: Open Simulator
open -a Simulator

# Get your Mac's IP address
ipconfig getifaddr en0
```

Then in Safari (iOS Simulator): Navigate to `http://YOUR_IP:3000`

## Alternative: Use ngrok (Tunneling Tool)

If the above doesn't work, use ngrok to create a public URL:

```bash
# Install ngrok (if not installed)
brew install ngrok

# In one terminal: Start your dev server
npm run dev

# In another terminal: Create tunnel
ngrok http 3000
```

This will give you a public URL like `https://abc123.ngrok.io` that you can access from any device.

## Testing on a Real iOS Device:

1. Make sure your iPhone and Mac are on the same WiFi network
2. Find your Mac's IP address: `ipconfig getifaddr en0`
3. On your iPhone, open Safari and go to: `http://YOUR_MAC_IP:3000`
