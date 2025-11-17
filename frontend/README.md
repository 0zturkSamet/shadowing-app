# ShadowTube Frontend

Modern Next.js 14 frontend for ShadowTube - A language learning web application that helps users master languages through video shadowing with YouTube content.

## Features

### Core Features
- 🎥 **YouTube Integration** - Paste any YouTube URL and start practicing immediately
- 📝 **Synchronized Transcript** - AI-generated transcript with auto-scroll and word highlighting
- ✅ **Sentence Completion Tracking** - Mark sentences complete with visible tick icons
- 🔄 **Auto-Scroll** - Transcript automatically follows video playback
- 🔁 **Loop Mode** - Repeat sentences for better practice
- ⏯️ **Playback Controls** - Preview, Play/Pause, Next sentence navigation

### Advanced Features
- 📊 **Progress Tracking** - Monitor completed/total sentences and percentage
- 💾 **Smart Caching** - IndexedDB + localStorage for offline access
- 📈 **User Dashboard** - View practice history and statistics
- 🔐 **Google OAuth** - Secure authentication with Google Sign-In
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile
- 🎨 **Modern UI** - Clean wireframe design with ShadowTube branding

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Video Player**: YouTube IFrame API
- **Database**: Dexie.js (IndexedDB wrapper)
- **State Management**: React Hooks (custom)
- **HTTP Client**: Fetch API
- **Icons**: Lucide React
- **Authentication**: Google OAuth 2.0

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Backend API running (see backend/README.md)

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Create environment file**:
```bash
cp .env.example .env.local
```

3. **Configure environment variables** in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

4. **Run development server**:
```bash
npm run dev
```

5. **Open application**:
- Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx                     # Landing page
│   ├── layout.tsx                   # Root layout with providers
│   ├── globals.css                  # Global styles and Tailwind
│   ├── login/
│   │   └── page.tsx                 # Google OAuth login page
│   ├── practice/
│   │   ├── page.tsx                 # Main practice interface
│   │   └── components/
│   │       ├── TranscriptPanel.tsx  # Transcript with tick icons
│   │       ├── VideoPlayer.tsx      # YouTube player wrapper
│   │       └── ControlPanel.tsx     # Playback controls
│   └── dashboard/
│       └── page.tsx                 # User statistics dashboard
│
├── lib/
│   ├── hooks/
│   │   ├── useYouTubeSync.ts        # Video-transcript sync hook
│   │   ├── useVideoPlayer.ts        # Video player controls
│   │   └── useAuth.ts               # Authentication hook
│   ├── services/
│   │   ├── db.ts                    # IndexedDB (Dexie) setup
│   │   ├── seedCache.ts             # Pre-cache demo videos
│   │   ├── videoService.ts          # Video API client
│   │   └── authService.ts           # Authentication API
│   ├── api/
│   │   └── client.ts                # Base API client
│   └── utils/
│       ├── youtube.ts               # YouTube URL parsing
│       └── time.ts                  # Time formatting
│
├── components/
│   ├── Header.tsx                   # App header with navigation
│   ├── Footer.tsx                   # App footer
│   └── ui/                          # Reusable UI components
│
├── public/
│   └── images/                      # Static images
│
└── types/
    └── index.ts                     # TypeScript type definitions
```

## Key Components

### Landing Page (`app/page.tsx`)
- Hero section with app description
- Feature cards highlighting key capabilities
- Call-to-action for getting started
- Clean wireframe design

### Practice Page (`app/practice/page.tsx`)
- **Video Player**: YouTube IFrame API integration with playback controls
- **Transcript Panel**: Synchronized sentence highlighting with auto-scroll
- **Control Panel**: Preview, Play/Pause, Next, Loop mode toggle
- **Progress Tracking**: Completed/Total sentences and percentage
- **Tick Icons**: Mark sentences complete (green when done, gray on hover)

### Transcript Panel (`app/practice/components/TranscriptPanel.tsx`)
- Sentence-by-sentence display
- Click to jump to timestamp
- Tick icon for completion tracking
- Auto-scroll to current sentence
- Highlight current sentence

### Dashboard (`app/dashboard/page.tsx`)
- Practice session history
- Total videos practiced
- Total sentences completed
- Average progress percentage
- Recent activity timeline

## Custom Hooks

### `useYouTubeSync`
Synchronizes video playback with transcript highlighting.

```typescript
const {
  currentSentenceIndex,
  completedSentences,
  markSentenceComplete,
  jumpToTime,
  autoScroll
} = useYouTubeSync(sentences, playerRef, playerReady, videoId);
```

**Features**:
- Updates current sentence based on video time
- Persists completed sentences to localStorage
- Provides sentence completion toggle
- Supports auto-scroll control

### `useVideoPlayer`
Manages YouTube player controls and state.

```typescript
const {
  playerRef,
  playerReady,
  play,
  pause,
  seekTo,
  getCurrentTime
} = useVideoPlayer();
```

## Services

### Video Service (`lib/services/videoService.ts`)
API client for video and transcript operations.

```typescript
// Get transcript (from cache or generate with Whisper)
const transcript = await getTranscript(videoId);

// Get video info
const info = await getVideoInfo(videoId);

// Search videos
const results = await searchVideos(query, language);
```

### Cache Service (`lib/services/seedCache.ts`)
Pre-caches demo videos for instant loading.

```typescript
// Seed demo videos into IndexedDB
await seedDemoVideosCache();

// Check if demo videos are cached
const cached = await areDemoVideosCached();
```

### Database Service (`lib/services/db.ts`)
IndexedDB wrapper using Dexie.js for client-side storage.

```typescript
// Store transcript
await db.transcripts.put({
  videoId,
  title,
  transcript,
  cachedAt: new Date()
});

// Retrieve transcript
const cached = await db.transcripts.get(videoId);
```

## Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking

# Maintenance
npm run clean        # Clean build artifacts
```

## Styling

The project uses **Tailwind CSS** with a custom color scheme:

### ShadowTube Brand Colors
```css
/* Primary - Red accent (ShadowTube logo) */
--color-primary: #ef4444        /* Red-500 */
--color-primary-dark: #dc2626   /* Red-600 */

/* Neutral - Grayscale */
--color-neutral-50: #f9fafb
--color-neutral-100: #f3f4f6
--color-neutral-600: #4b5563
--color-neutral-900: #111827

/* Success - Green for completed */
--color-success: #10b981        /* Emerald-500 */

/* Warning - Yellow for active */
--color-warning: #f59e0b        /* Amber-500 */
```

### Custom Utilities
```css
/* Rounded corners with ShadowTube style */
.rounded-shadowtube {
  border-radius: 0.375rem; /* 6px */
}

/* Shadow for cards */
.shadow-shadowtube {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

## State Management

### localStorage Keys
```
shadowing_completed_{videoId}    # Completed sentence IDs
shadowing_loop_mode              # Loop mode preference
shadowing_auto_scroll            # Auto-scroll preference
```

### IndexedDB Schema
```typescript
// Database: shadowing-cache
{
  transcripts: {
    videoId: string (primary key)
    title: string
    transcript: TranscriptSentence[]
    cachedAt: Date
  }
}
```

## API Integration

The frontend connects to the FastAPI backend at `NEXT_PUBLIC_API_URL`.

### Authentication
```typescript
// Google OAuth login
POST /api/auth/google
Body: { credential: string }

// Get current user
GET /api/auth/me
Headers: { Authorization: "Bearer {token}" }
```

### Videos
```typescript
// Get transcript
GET /api/videos/transcripts/{videoId}

// Generate Whisper transcript
POST /api/videos/transcripts/{videoId}/whisper
Body: { language?: string }

// Get video info
GET /api/videos/info/{videoId}
```

### Practice Sessions
```typescript
// Create session
POST /api/sessions
Body: { video_id, total_sentences }

// Update session progress
PUT /api/sessions/{sessionId}
Body: { completed_sentences, progress_percentage }

// Get user stats
GET /api/sessions/stats
```

## Environment Variables

Create `.env.local` in the frontend directory:

```bash
# Backend API URL (required)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Google OAuth Client ID (required)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# Optional: Analytics
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
```

## Caching Strategy

### Backend Cache (Redis)
- Transcripts cached for 30 days
- Checked before Whisper API calls
- Reduces API costs

### Frontend Cache (IndexedDB)
- Client-side transcript storage
- Demo videos pre-seeded
- Offline access support
- Faster subsequent loads

### localStorage
- Completed sentences per video
- User preferences (loop mode, auto-scroll)
- Persists across sessions

## Development Notes

### Implemented Features
- ✅ Landing page with features
- ✅ Google OAuth authentication
- ✅ YouTube video player integration
- ✅ Whisper transcript display
- ✅ Auto-scroll synchronized transcript
- ✅ Sentence completion tracking with tick icons
- ✅ Progress calculation (completed/total)
- ✅ Loop mode for sentence practice
- ✅ Dashboard with statistics
- ✅ IndexedDB caching with Dexie
- ✅ localStorage persistence
- ✅ Responsive mobile design

### Future Enhancements
- [ ] Speech recognition for pronunciation feedback
- [ ] Spaced repetition algorithm
- [ ] Video playlists and bookmarks
- [ ] Social features (share progress)
- [ ] Dark mode support
- [ ] Offline mode improvements
- [ ] Progressive Web App (PWA)
- [ ] Multi-language UI support

## Deployment

### Vercel (Recommended)

1. **Connect repository**:
   - Import project to Vercel
   - Connect GitHub repository

2. **Configure environment variables**:
   - Add `NEXT_PUBLIC_API_URL`
   - Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

3. **Deploy**:
   - Automatic deployment on git push
   - Preview deployments for PRs

### Other Platforms

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### Common Issues

**Error: "API connection failed"**
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure backend is running
- Check CORS settings in backend

**Error: "Google OAuth failed"**
- Verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- Check authorized origins in Google Console
- Ensure redirect URI matches

**Error: "Video not loading"**
- Check YouTube video ID is valid
- Verify video is not private or restricted
- Check browser console for errors

**Error: "Transcript not appearing"**
- Ensure backend has OpenAI API key
- Check browser console for API errors
- Verify video has audio track

**Tick icons not visible**
- Completed sentences show green tick icons (always visible)
- Incomplete sentences show gray tick on hover
- Click tick to toggle completion status

## Performance Optimization

- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: `npm run analyze` (if configured)
- **Lazy Loading**: Dynamic imports for heavy components
- **Caching**: IndexedDB + localStorage reduce API calls

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open Pull Request

## License

This project is part of the ShadowTube language learning platform.
