# TinyTally - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Install Dependencies

```bash
cd ~/tiny-tally-pwa
npm install
```

### Step 2: Create PWA Icons

**Quick Method - Use Online Tool:**

1. Go to https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload `public/icon-template.svg` (or any 512x512 image)
3. Download the generated icons
4. Extract all PNG files to `public/icons/` directory

**Manual Method - Create Simple Icons:**

If you just want to test quickly, you can create placeholder icons:

```bash
# Create icons directory
mkdir -p public/icons

# For macOS with ImageMagick (install with: brew install imagemagick)
for size in 72 96 128 144 152 192 384 512; do
  convert -size ${size}x${size} xc:'#60a5fa' public/icons/icon-${size}x${size}.png
done
```

Or simply copy any square image to each size for testing:
```bash
mkdir -p public/icons
cp your-image.png public/icons/icon-72x72.png
cp your-image.png public/icons/icon-96x96.png
cp your-image.png public/icons/icon-128x128.png
cp your-image.png public/icons/icon-144x144.png
cp your-image.png public/icons/icon-152x152.png
cp your-image.png public/icons/icon-192x192.png
cp your-image.png public/icons/icon-384x384.png
cp your-image.png public/icons/icon-512x512.png
```

### Step 3: Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Step 4: Test the App

1. **First Launch**: Enter your child's name and date of birth
2. **Dashboard**: You'll see three quick log buttons
3. **Log a Feed**: Tap the Feed button and log a feeding session
4. **Log a Diaper**: Tap the Diaper button and record a diaper change
5. **Log Sleep**: Tap the Sleep button to track sleep

### Step 5: Test PWA Features

**On Desktop:**
1. In Chrome, click the install icon (⊕) in the address bar
2. Click "Install"

**On Mobile (Android - Chrome):**
1. Open http://YOUR_IP:3000 on your phone (use your computer's IP)
2. Tap the menu (⋮) → "Add to Home screen"

**On Mobile (iOS - Safari):**
1. Open http://YOUR_IP:3000 on your phone
2. Tap Share button → "Add to Home Screen"

## 🏗️ Building for Production

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 🌐 Deploy to Production

### Option 1: Netlify (Easiest)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

### Option 2: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Option 3: Any Static Host

Just upload the contents of the `dist` folder to any web host that supports:
- Static file serving
- HTTPS (required for PWA)

Examples:
- GitHub Pages
- Firebase Hosting
- AWS S3 + CloudFront
- DigitalOcean App Platform
- Render

## 📱 Testing on Your Phone

### Method 1: Using Your Local IP

1. Find your computer's local IP:
   ```bash
   # On macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # On Windows
   ipconfig
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. On your phone, open: `http://YOUR_IP:3000`

### Method 2: Using ngrok (If you need HTTPS)

1. Install ngrok: https://ngrok.com/download

2. Start your dev server:
   ```bash
   npm run dev
   ```

3. In another terminal, run:
   ```bash
   ngrok http 3000
   ```

4. Use the HTTPS URL provided by ngrok on your phone

## 🎨 Customization Tips

### Change App Name

1. Edit `package.json`: Update `name` and `description`
2. Edit `vite.config.js`: Update `manifest.name` and `manifest.short_name`
3. Edit `index.html`: Update `<title>` tag
4. Edit `README.md`: Update references to TinyTally

### Change Colors

Edit `tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      primary: {
        500: '#your-color',
        // ... other shades
      }
    }
  }
}
```

Common color changes:
- Blue theme (default): `#60a5fa`
- Pink theme: `#ec4899`
- Green theme: `#10b981`
- Purple theme: `#a855f7`

### Add More Features

The codebase is modular and easy to extend:

- **Add new tracking categories**: Create a new service in `src/services/db.js`
- **Add new pages**: Create components and add routes in `src/App.jsx`
- **Modify forms**: Edit components in `src/components/`

## 🐛 Common Issues

### Issue: Icons not loading

**Solution**: Make sure all 8 icon sizes exist in `public/icons/`

### Issue: App won't install on iPhone

**Solution**:
- Must use Safari (not Chrome)
- Must be served over HTTPS (ngrok or deployed)
- Check all icons are PNG format

### Issue: Data not persisting

**Solution**: Check browser console for errors. Make sure IndexedDB is not disabled.

### Issue: Port 3000 already in use

**Solution**:
```bash
# Use a different port
npm run dev -- --port 3001
```

## 📚 Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Customize the app to your needs
- Deploy to production
- Install on your phone
- Start tracking your baby's activities!

## 💡 Pro Tips

1. **Backup your data**: Use the "Export Data" feature in Settings regularly
2. **Install on both phones**: Parents can each install the PWA
3. **Use in airplane mode**: Test offline functionality
4. **Add to daily routine**: Keep the app on your home screen for quick access

## 🆘 Need Help?

- Check the browser console for errors (F12 → Console)
- Ensure all dependencies installed correctly
- Try clearing browser cache and hard refresh
- Make sure you're using a modern browser

---

Enjoy using TinyTally! 👶📊
