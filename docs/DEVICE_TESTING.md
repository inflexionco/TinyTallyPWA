# Testing TinyTally on Android and iOS Devices

This guide explains how to run and test TinyTally PWA on your Android and iOS devices.

## 🚀 Quick Start

There are two methods to test on your devices:
1. **Local Network Testing** (Recommended for development)
2. **Deploy and Test** (Recommended for production testing)

---

## Method 1: Local Network Testing

### Prerequisites
- Your computer and mobile device must be on the **same WiFi network**
- Development server running on your computer

### Step 1: Find Your Computer's IP Address

**On macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows:**
```bash
ipconfig
```

**On Linux:**
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Look for an IP address like `192.168.x.x` or `10.0.x.x`

### Step 2: Start the Development Server

```bash
cd ~/tiny-tally-pwa
npm run dev
```

The server will start on `http://localhost:3000`

### Step 3A: Test on Android

1. **Open Chrome or Edge** on your Android device

2. **Enter the URL** in the address bar:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```
   Example: `http://192.168.1.100:3000`

3. **The app should load!** You can now test all features.

4. **Install as PWA** (Optional):
   - Tap the **menu** (⋮) in Chrome
   - Select **"Add to Home screen"** or **"Install app"**
   - Tap **"Add"** or **"Install"**
   - The app icon will appear on your home screen

5. **Grant Permissions** (if needed):
   - Allow location, camera, or other permissions if prompted
   - These are needed for full PWA functionality

### Step 3B: Test on iOS (iPhone/iPad)

1. **Open Safari** on your iOS device
   - ⚠️ **Important:** Must use Safari (not Chrome or other browsers)
   - PWA installation only works in Safari on iOS

2. **Enter the URL** in the address bar:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```
   Example: `http://192.168.1.100:3000`

3. **The app should load!** You can now test all features.

4. **Install as PWA**:
   - Tap the **Share button** (square with arrow pointing up)
   - Scroll down and tap **"Add to Home Screen"**
   - Edit the name if desired (default: "TinyTally")
   - Tap **"Add"** in the top right
   - The app icon will appear on your home screen

5. **Launch the PWA**:
   - Tap the TinyTally icon on your home screen
   - It will open in full-screen mode (like a native app)
   - No browser UI will be visible

### Troubleshooting Local Network Testing

**Problem: Can't connect from phone**
- Make sure both devices are on the **same WiFi network**
- Check if your firewall is blocking port 3000
- Try temporarily disabling your firewall

**On macOS, allow incoming connections:**
```bash
# Allow port 3000 through firewall (temporary)
sudo pfctl -d  # Disable firewall (not recommended for public networks)
```

**Problem: Connection refused**
- Make sure dev server is running: `npm run dev`
- Check that you're using the correct IP address
- Try `0.0.0.0` instead of `localhost` in vite.config.js:
  ```js
  server: {
    host: '0.0.0.0',
    port: 3000
  }
  ```

**Problem: PWA features don't work**
- Local HTTP connections have limited PWA features
- For full PWA functionality, use HTTPS (see Method 2 or use ngrok)

---

## Method 2: Using ngrok for HTTPS Testing

ngrok creates a secure tunnel to your local server, providing HTTPS access (required for full PWA features on iOS).

### Step 1: Install ngrok

Download from: https://ngrok.com/download

Or install via Homebrew (macOS):
```bash
brew install ngrok
```

### Step 2: Start Development Server

```bash
cd ~/tiny-tally-pwa
npm run dev
```

### Step 3: Start ngrok Tunnel

In a **new terminal window**:
```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### Step 4: Access on Mobile Devices

**On Android (Chrome/Edge):**
1. Open the ngrok HTTPS URL: `https://abc123.ngrok.io`
2. Install as PWA from the menu

**On iOS (Safari):**
1. Open the ngrok HTTPS URL: `https://abc123.ngrok.io`
2. Tap Share → "Add to Home Screen"
3. Launch from home screen

### Benefits of ngrok:
- ✅ HTTPS enabled (required for full PWA features)
- ✅ Works from anywhere (not just local network)
- ✅ Can share URL with others for testing
- ✅ All PWA features work properly

---

## Method 3: Deploy and Test (Production)

Deploy your app to a hosting service and test the production version.

### Option A: Deploy to Netlify

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

3. **Deploy:**
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. **Get your URL:**
   - Netlify will give you a URL like: `https://tiny-tally-abc123.netlify.app`

5. **Test on devices:**
   - Open the URL on your Android or iOS device
   - Install as PWA

### Option B: Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   npm run build
   vercel --prod
   ```

3. **Get your URL** and test on devices

### Option C: Deploy to GitHub Pages

1. **Update `vite.config.js`:**
   ```js
   export default defineConfig({
     base: '/TinyTallyPWA/',
     // ... rest of config
   })
   ```

2. **Install gh-pages:**
   ```bash
   npm install -D gh-pages
   ```

3. **Add deploy script to `package.json`:**
   ```json
   {
     "scripts": {
       "deploy": "npm run build && gh-pages -d dist"
     }
   }
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

5. **Access at:**
   ```
   https://yourusername.github.io/TinyTallyPWA/
   ```

---

## 📱 Testing Checklist

After installing on your device, test these features:

### ✅ Basic Functionality
- [ ] App loads correctly
- [ ] Can create child profile
- [ ] Can log feed entry
- [ ] Can log diaper entry
- [ ] Can log sleep entry
- [ ] Can log weight entry

### ✅ PWA Features
- [ ] App icon appears on home screen
- [ ] App opens in full-screen (no browser UI)
- [ ] App works offline
- [ ] Data persists after closing
- [ ] Can navigate between pages

### ✅ Mobile UX
- [ ] All buttons are easy to tap
- [ ] Text is readable
- [ ] Forms work correctly
- [ ] Date/time pickers work
- [ ] Keyboard doesn't obstruct inputs
- [ ] No horizontal scrolling

### ✅ Offline Testing
- [ ] Turn off WiFi/Mobile data
- [ ] Open the app (should still work)
- [ ] Log an entry
- [ ] Turn WiFi back on
- [ ] Verify data is still there

---

## 🎯 Recommended Testing Flow

### For Development Testing:
1. Use **Local Network** (Method 1) for quick testing
2. Use **ngrok** (Method 2) when you need HTTPS features

### For Production Testing:
1. Deploy to **Netlify/Vercel** (Method 3)
2. Share URL with family/friends for real-world testing
3. Install as PWA on actual devices

---

## 🔧 Advanced: Custom Domain

If you want a custom domain like `tinytally.yourdomain.com`:

### With Netlify:
1. Deploy your app to Netlify
2. Go to **Domain Settings**
3. Add your custom domain
4. Update DNS records as instructed

### With Vercel:
1. Deploy your app to Vercel
2. Go to **Domains** settings
3. Add your custom domain
4. Update DNS records as instructed

---

## 📊 Performance Testing

Test your PWA performance using:

### Lighthouse (Chrome DevTools)
1. Open your deployed app in Chrome
2. Press F12 (DevTools)
3. Go to **Lighthouse** tab
4. Click **"Generate report"**
5. Check PWA score (aim for 90+)

### PWA Checklist
Run: https://www.pwastats.com/
Enter your deployed URL to check PWA compliance

---

## 🐛 Common Issues

### Issue: "Add to Home Screen" not showing

**On Android:**
- Make sure you're using Chrome or Edge
- The site must be served over HTTPS (use ngrok or deploy)
- Clear browser cache and try again

**On iOS:**
- Must use Safari
- Must be served over HTTPS (except localhost)
- Check that manifest.json is loading correctly

### Issue: App doesn't work offline

- Check service worker is registered
- Open DevTools → Application → Service Workers
- Make sure "Update on reload" is checked
- Clear app data and reinstall

### Issue: Data not persisting

- Check browser storage isn't full
- Check IndexedDB is not disabled
- Try clearing app data and reinstalling
- Check browser console for errors

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors (F12 → Console)
2. Verify service worker is active (F12 → Application → Service Workers)
3. Test on a different device/browser
4. Try clearing browser cache
5. Reinstall the PWA

---

## 🎉 You're Ready!

Now you can:
- ✅ Test TinyTally on your Android device
- ✅ Test TinyTally on your iOS device (iPhone/iPad)
- ✅ Install it as a PWA
- ✅ Share it with family members
- ✅ Use it offline

**Happy tracking! 👶📊**
