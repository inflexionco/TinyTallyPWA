# TinyTally - Baby Activity Tracker PWA

A Progressive Web App (PWA) designed to help parents track their child's daily activities including milk intake, diaper changes, and sleep patterns.

## Features

- **Mobile-First Design**: Optimized for touchscreens with large, finger-friendly buttons
- **Offline Capability**: Works without internet connection using IndexedDB for local storage
- **Installable PWA**: Add to home screen on both Android and iOS devices
- **Activity Tracking**:
  - Milk intake (Breastfeeding, Formula, Pumped milk)
  - Diaper changes (Wet, Dirty, or Both with detailed tracking)
  - Sleep tracking (Naps and night sleep with duration)
- **Dashboard**: Quick overview of today's activities and stats
- **History**: View past days' activities and statistics
- **Data Export**: Export all data as JSON for backup

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Dexie.js** - IndexedDB wrapper for local data storage
- **React Router** - Client-side routing
- **Lucide React** - Icon library
- **date-fns** - Date formatting utilities
- **Workbox** - Service worker for offline support

## Project Structure

```
tiny-tally-pwa/
├── public/
│   └── icons/              # PWA icons (72x72 to 512x512)
├── src/
│   ├── components/
│   │   ├── ChildProfileSetup.jsx
│   │   ├── Dashboard.jsx
│   │   ├── EventList.jsx
│   │   ├── History.jsx
│   │   ├── LogDiaper.jsx
│   │   ├── LogFeed.jsx
│   │   ├── LogSleep.jsx
│   │   └── Settings.jsx
│   ├── services/
│   │   └── db.js          # Dexie database and services
│   ├── utils/
│   │   └── dateUtils.js   # Date formatting utilities
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm (or yarn)

### Installation

1. Navigate to the project directory:
   ```bash
   cd ~/tiny-tally-pwa
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create PWA icons (or use placeholder icons for development):

   You'll need icons in the following sizes in the `public/icons/` directory:
   - 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

   For development, you can use any image and resize it, or use online tools like:
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Building for Production

Build the production bundle:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deployment

### Option 1: Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Build and deploy:
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

### Option 2: Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   npm run build
   vercel --prod
   ```

### Option 3: GitHub Pages

1. Install gh-pages:
   ```bash
   npm install -D gh-pages
   ```

2. Add to `package.json`:
   ```json
   {
     "scripts": {
       "deploy": "npm run build && gh-pages -d dist"
     }
   }
   ```

3. Update `vite.config.js` to set the base path:
   ```js
   export default defineConfig({
     base: '/tiny-tally-pwa/',
     // ... rest of config
   })
   ```

4. Deploy:
   ```bash
   npm run deploy
   ```

## PWA Installation

### On Android (Chrome/Edge):

1. Open the app in Chrome or Edge
2. Tap the menu (⋮) and select "Add to Home screen" or "Install app"
3. Follow the prompts

### On iOS (Safari):

1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

## Features Explained

### Child Profile Setup

On first launch, you'll be prompted to enter your child's name and date of birth. This information is stored locally on your device.

### Dashboard

- Quick log buttons for Feed, Diaper, and Sleep
- Today's summary showing total feeds, diapers, and sleep hours
- Last activity summary
- Chronological list of today's events

### Logging Activities

**Feed:**
- Select feed type (Breastfeeding Left/Right, Formula, or Pumped Milk)
- For breastfeeding: Enter duration manually or use built-in timer
- For bottle feeding: Enter amount in oz or ml
- Add optional notes

**Diaper:**
- Select type (Wet, Dirty, or Both)
- For wet: Select wetness level (Small, Medium, Large, Soaked)
- For dirty: Select consistency, color, and quantity
- Add optional notes

**Sleep:**
- Start sleep tracking in real-time, or
- Log past sleep with start and end times
- Select type (Nap or Night Sleep)
- Add optional notes

### History

- Navigate through past days
- View daily statistics
- See all activities for any given day

### Settings

- Edit child profile
- Export all data as JSON backup
- Clear all data (with confirmation)

## Data Storage

All data is stored locally on your device using IndexedDB. Your data:
- Never leaves your device
- Is not synced to any cloud service
- Persists across browser sessions
- Can be exported as JSON for backup

## Offline Support

The app uses a service worker to cache assets and enable offline functionality:
- UI and assets are cached for offline use
- Data entry works offline
- App updates automatically when online

## Browser Support

- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- iOS Safari 14+
- Android Chrome 90+

## Customization

### Changing Colors

Edit `tailwind.config.js` to customize the color palette:

```js
theme: {
  extend: {
    colors: {
      primary: {
        // Your custom colors
      }
    }
  }
}
```

### Changing App Name

1. Update `package.json` name and description
2. Update `vite.config.js` manifest name and short_name
3. Update `index.html` title and meta tags
4. Update component headers as needed

## Troubleshooting

### Icons not showing

Make sure you have created all required icon sizes in `public/icons/`:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

### App not installing on iOS

- Ensure you're using Safari (not Chrome)
- Check that the manifest is properly configured
- Icons must be in PNG format
- The app must be served over HTTPS (except localhost)

### Data not persisting

- Check browser console for IndexedDB errors
- Ensure browser supports IndexedDB
- Check that browser storage is not full
- Try clearing browser cache and reinstalling

### Service worker not updating

- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Unregister the service worker in DevTools > Application > Service Workers

## Contributing

This is a personal project template, but feel free to fork and customize for your needs.

## License

MIT License - Feel free to use this project for personal or commercial purposes.

## Acknowledgments

- Icons from [Lucide](https://lucide.dev/)
- Built with guidance from React and Vite documentation
- PWA best practices from [web.dev](https://web.dev/progressive-web-apps/)
