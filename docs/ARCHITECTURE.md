# TinyTally Architecture Documentation

## Overview

TinyTally is a Progressive Web App built with React, designed to track baby activities offline-first. This document explains the technical architecture and design decisions.

## Technology Stack

### Core Technologies

- **React 18.2**: Component-based UI framework
- **Vite 5.1**: Fast build tool and dev server with hot module replacement
- **React Router 6.22**: Client-side routing
- **Tailwind CSS 3.4**: Utility-first CSS framework

### Data Layer

- **Dexie.js 3.2**: Wrapper around IndexedDB for local storage
- **IndexedDB**: Browser-native database for offline data persistence

### PWA Features

- **vite-plugin-pwa**: Vite plugin for PWA manifest and service worker generation
- **Workbox 7**: Service worker library for caching strategies

### Utilities

- **date-fns 3.3**: Date formatting and manipulation
- **lucide-react**: Icon library

## Project Structure

```
src/
├── components/          # React components
│   ├── ChildProfileSetup.jsx    # Initial setup wizard
│   ├── Dashboard.jsx            # Main home screen
│   ├── EventList.jsx           # Reusable event list component
│   ├── History.jsx             # Historical data viewer
│   ├── LogDiaper.jsx           # Diaper logging form
│   ├── LogFeed.jsx             # Feed logging form
│   ├── LogSleep.jsx            # Sleep logging form
│   └── Settings.jsx            # App settings and data management
├── services/
│   └── db.js                   # Database layer (Dexie + services)
├── utils/
│   └── dateUtils.js            # Date formatting utilities
├── App.jsx                     # Root component with routing
├── main.jsx                    # Application entry point
└── index.css                   # Global styles + Tailwind
```

## Architecture Layers

### 1. Data Layer (`src/services/db.js`)

**Responsibilities:**
- Database schema definition
- CRUD operations for all entity types
- Data aggregation and statistics

**Design Pattern:** Service Layer Pattern

**Key Services:**

```javascript
childService    // Child profile management
feedService     // Feed tracking operations
diaperService   // Diaper tracking operations
sleepService    // Sleep tracking operations
statsService    // Data aggregation and statistics
```

**Database Schema:**

```javascript
{
  child: {
    id: auto-increment,
    name: string,
    dateOfBirth: date
  },

  feeds: {
    id: auto-increment,
    childId: number,
    timestamp: date,
    type: enum('breastfeeding-left', 'breastfeeding-right', 'formula', 'pumped'),
    duration: number (minutes, for breastfeeding),
    amount: number (for bottle feeding),
    unit: enum('oz', 'ml'),
    notes: string
  },

  diapers: {
    id: auto-increment,
    childId: number,
    timestamp: date,
    type: enum('wet', 'dirty', 'both'),
    wetness: enum('small', 'medium', 'large', 'soaked'),
    consistency: enum('liquid', 'soft', 'seedy', 'formed', 'hard'),
    color: enum('yellow', 'green', 'brown', 'black', 'red'),
    quantity: enum('small', 'medium', 'large'),
    notes: string
  },

  sleep: {
    id: auto-increment,
    childId: number,
    startTime: date,
    endTime: date (nullable for active sleep),
    type: enum('nap', 'night'),
    notes: string
  }
}
```

**Why Dexie.js?**
- Type-safe API over raw IndexedDB
- Promise-based (async/await friendly)
- Advanced querying capabilities
- React hooks integration (`dexie-react-hooks`)
- Better error handling

### 2. Utility Layer (`src/utils/`)

**Date Utilities (`dateUtils.js`):**

```javascript
formatTime()          // "3:45 PM"
formatDate()          // "Jan 15, 2024"
formatDateTime()      // "Jan 15, 2024 3:45 PM"
formatTimeAgo()       // "2 hours ago"
formatDuration()      // "2h 15m"
calculateDuration()   // Calculate minutes between dates
getDateLabel()        // "Today", "Yesterday", or formatted date
getAgeInWeeks()       // "5w 3d"
```

### 3. Component Layer

#### Component Hierarchy

```
App
├── ChildProfileSetup (if no child profile)
└── Routes
    ├── Dashboard
    │   └── EventList
    ├── LogFeed
    ├── LogDiaper
    ├── LogSleep
    ├── History
    │   └── EventList
    └── Settings
```

#### Component Patterns

**1. Container Components** (Dashboard, History, Settings)
- Manage state and data fetching
- Handle business logic
- Pass data to presentational components

**2. Form Components** (LogFeed, LogDiaper, LogSleep)
- Controlled form inputs
- Local form state management
- Validation and submission
- Navigation after successful submission

**3. Presentational Components** (EventList)
- Pure display logic
- Receive data via props
- Callback props for user actions

#### State Management

**No Global State Library** - Using React's built-in state management:

- **Component State**: Form inputs, UI state
- **Data Fetching**: useEffect hooks to load from IndexedDB
- **Props**: Pass data and callbacks between components

**Why no Redux/Context?**
- App is small enough that prop drilling is manageable
- Data is fetched fresh from IndexedDB on each page
- No complex shared state between routes

### 4. Routing Layer

**React Router Configuration:**

```javascript
/ → Dashboard           // Main home screen
/log-feed → LogFeed     // Feed logging
/log-diaper → LogDiaper // Diaper logging
/log-sleep → LogSleep   // Sleep logging
/history → History      // Historical data
/settings → Settings    // App settings
```

**Navigation Pattern:**
- All logging screens navigate back to Dashboard on success
- Dashboard is the central hub
- Back buttons use `navigate('/')` for consistency

### 5. Styling Layer

**Tailwind CSS Approach:**

**Custom Components** (in `index.css`):
```css
@layer components {
  .btn-primary       // Primary action button
  .btn-secondary     // Secondary action button
  .btn-quick-log     // Dashboard quick log buttons
  .input-field       // Form inputs
  .select-field      // Select dropdowns
  .card              // Content cards
  .event-card        // Event list items
  .badge             // Status badges
}
```

**Design System:**
- Colors: Blue primary (#60a5fa), soft pastels
- Spacing: 4px base unit (Tailwind default)
- Border radius: 12px-24px for modern look
- Shadows: Soft shadows for depth
- Typography: System fonts for native feel

**Mobile-First Approach:**
- Base styles are mobile
- No media queries needed (everything is mobile-optimized)
- Touch targets: Minimum 44x44px
- Font size: 16px minimum (prevents iOS zoom)

### 6. PWA Layer

**Manifest Configuration** (`vite.config.js`):

```javascript
{
  name: 'TinyTally - Baby Tracker',
  short_name: 'TinyTally',
  display: 'standalone',        // Hides browser UI
  orientation: 'portrait',      // Locks to portrait
  theme_color: '#60a5fa',       // Address bar color
  background_color: '#f0f9ff',  // Splash screen color
  icons: [...],                 // 8 sizes from 72px to 512px
}
```

**Service Worker Strategy:**

```javascript
// Workbox configuration
globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']

// Runtime caching for fonts
runtimeCaching: [
  {
    urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
    handler: 'CacheFirst',
    cacheName: 'google-fonts-cache',
    expiration: { maxAgeSeconds: 31536000 }
  }
]
```

**Cache Strategy:**
- Static assets: Precached at install
- Google Fonts: Cache First strategy
- Data: Not cached (always from IndexedDB)

**Offline Capability:**
- All UI assets available offline
- Data stored in IndexedDB (always available)
- Service worker handles offline navigation
- Updates automatically when online

## Data Flow

### Example: Logging a Feed

1. **User Action**: User navigates to `/log-feed`
2. **Component Mount**: `LogFeed` component mounts
3. **Form State**: Local state manages form inputs
4. **User Input**: User selects feed type, enters duration/amount
5. **Submit**: Form submission handler is called
6. **Validation**: Form validates inputs
7. **Service Call**: `feedService.addFeed()` is called
8. **Database Write**: Dexie writes to IndexedDB
9. **Navigation**: `navigate('/')` redirects to Dashboard
10. **Dashboard Mount**: Dashboard loads fresh data
11. **Data Fetch**: Parallel fetch of feeds, diapers, sleep
12. **Aggregation**: Stats calculated from all data
13. **Render**: Dashboard displays updated data

### Example: Viewing History

1. **User Action**: User navigates to `/history`
2. **Component Mount**: History component mounts with today's date
3. **Data Fetch**: `statsService.getDailyStats()` for selected date
4. **Event Aggregation**: All events combined and sorted
5. **Render**: EventList displays chronological events
6. **Date Navigation**: User clicks previous/next day
7. **State Update**: `selectedDate` state updates
8. **Re-fetch**: useEffect triggers new data fetch
9. **Render**: New day's data displayed

## Performance Optimizations

### 1. Database Indexing

```javascript
// Dexie schema with indexes
db.version(1).stores({
  feeds: '++id, childId, timestamp',    // Index on timestamp for sorting
  diapers: '++id, childId, timestamp',
  sleep: '++id, childId, startTime'
});
```

### 2. Data Fetching

- **Parallel Fetching**: Multiple async calls with `Promise.all()`
- **Filtered Queries**: Only fetch data for specific date ranges
- **Reverse Sorting**: Most recent first without full sort

### 3. Component Optimization

- **Lazy Loading**: Could add React.lazy() for routes (not needed for small app)
- **Key Props**: Proper keys on list items for efficient re-renders
- **Controlled Inputs**: Efficient form state updates

### 4. Bundle Optimization

- **Tree Shaking**: Vite automatically removes unused code
- **Code Splitting**: Automatic per-route splitting
- **Asset Optimization**: Images and fonts optimized at build time

## Security Considerations

### Data Privacy

- **Local Storage**: All data stays on device
- **No Backend**: No server to breach
- **No Authentication**: Not needed (single-user, local app)
- **No Telemetry**: No analytics or tracking

### Input Validation

- **Client-Side Only**: Form validation in components
- **Type Safety**: Database schema enforces types
- **Date Validation**: Max dates prevent future entries

### XSS Prevention

- **React Escaping**: JSX automatically escapes output
- **No innerHTML**: No use of dangerouslySetInnerHTML
- **Trusted Input**: User input is data, not code

## Offline-First Strategy

### Assumptions

1. **Single Device**: No sync between devices
2. **Local Data**: All data in IndexedDB
3. **No Backend**: No API calls (except optional future sync)

### Benefits

- Works without internet
- Fast (no network latency)
- Private (data never leaves device)
- Simple (no backend complexity)

### Trade-offs

- **No Multi-Device Sync**: Can't share data between devices
- **No Backup**: User must manually export data
- **No Collaboration**: Can't have multiple users editing same data

### Future Sync Strategy (if needed)

```
Local IndexedDB ←→ Sync Service ←→ Cloud Storage
                     ↓
              Conflict Resolution
                     ↓
              Other Devices
```

## Testing Strategy

### Manual Testing Checklist

**Functionality:**
- [ ] Child profile creation
- [ ] Feed logging (all types)
- [ ] Diaper logging (all types)
- [ ] Sleep logging (timer and manual)
- [ ] Dashboard stats accuracy
- [ ] History navigation
- [ ] Data export
- [ ] Data deletion

**PWA Features:**
- [ ] Install on Android
- [ ] Install on iOS
- [ ] Offline data entry
- [ ] Offline navigation
- [ ] Service worker updates

**UI/UX:**
- [ ] Mobile responsive
- [ ] Touch targets adequate
- [ ] Forms usable on small screens
- [ ] No horizontal scroll
- [ ] Fast loading

### Automated Testing (Future)

**Unit Tests** (with Vitest):
```javascript
// Test database services
describe('feedService', () => {
  it('should add a feed', async () => {
    const feed = await feedService.addFeed({...});
    expect(feed).toBeDefined();
  });
});
```

**Integration Tests** (with Testing Library):
```javascript
// Test component interactions
it('should submit feed form', async () => {
  render(<LogFeed child={mockChild} />);
  // ... interact with form
  // ... assert navigation
});
```

**E2E Tests** (with Playwright):
```javascript
// Test complete user flows
test('complete feed logging flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Feed');
  // ... complete form
  // ... verify data appears
});
```

## Deployment Considerations

### Build Process

```bash
npm run build
# Output: dist/
#   - index.html
#   - assets/*.js (code-split bundles)
#   - assets/*.css (optimized CSS)
#   - icons/* (compressed images)
#   - manifest.json
#   - sw.js (service worker)
```

### Hosting Requirements

- **HTTPS Required**: PWA requires secure context
- **Static Hosting**: No server-side rendering needed
- **SPA Routing**: Must redirect all routes to index.html
- **CORS**: Not needed (no API calls)
- **Headers**: Standard static hosting headers

### Recommended Hosts

1. **Netlify**: Zero config, automatic HTTPS, great free tier
2. **Vercel**: Similar to Netlify, optimized for React
3. **GitHub Pages**: Free, easy from Git repo
4. **Cloudflare Pages**: Fast global CDN
5. **Firebase Hosting**: Good for future Firebase integration

## Future Enhancements

### High Priority

1. **Data Sync**: Cloud backup and multi-device sync
2. **Statistics**: Charts and trends over time
3. **Notifications**: Reminders for feeding/medicine
4. **Multiple Children**: Support for twins, siblings

### Medium Priority

5. **Medicine Tracking**: Add medication logging
6. **Growth Tracking**: Weight, height, head circumference
7. **Doctor Appointments**: Schedule and notes
8. **Photo Diary**: Attach photos to events

### Low Priority

9. **Sharing**: Share reports with partner/doctor
10. **Import/Export**: CSV, PDF export formats
11. **Themes**: Dark mode, custom colors
12. **Widgets**: Home screen widgets (if supported)

## Conclusion

TinyTally is built with simplicity and offline-first principles. The architecture prioritizes:

1. **User Privacy**: Local data storage
2. **Offline Capability**: Works without internet
3. **Performance**: Fast, local database
4. **Maintainability**: Simple, clear code structure
5. **Extensibility**: Easy to add new features

The modular design makes it easy to understand, modify, and extend for your specific needs.
