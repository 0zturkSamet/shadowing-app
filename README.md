# 🎬 ShadowTube - Master Languages Through Video Shadowing

A modern full-stack application for practicing language learning through shadowing technique with YouTube videos. Built with Next.js, FastAPI, and OpenAI Whisper for accurate transcription.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Python](https://img.shields.io/badge/Python-3.11-yellow)

## 📸 Screenshots

### Landing Page
![Landing Page](screenshots/01-landing-page.png)
*Clean, modern interface with feature highlights*

### Practice Interface
![Practice Interface](screenshots/04-practice-initial.png)
*Video player with synchronized transcript and auto-scroll*

### Sentence Completion Tracking
![Completion Tracking](screenshots/05-practice-completed-ticks.png)
*Mark sentences as completed to track your progress*

### Dashboard & Statistics
![Dashboard](screenshots/06-dashboard-stats.png)
*Monitor your practice sessions and progress over time*

## ✨ Features

### Core Practice Features
- 🎥 **YouTube Integration** - Paste any YouTube URL and start practicing immediately
- 📝 **AI-Powered Transcription** - OpenAI Whisper generates accurate, word-level synchronized transcripts
- 🔄 **Auto-Scroll Transcript** - Transcript automatically follows video playback
- ✅ **Sentence Completion** - Mark sentences as completed with visible tick icons
- 🔁 **Loop Mode** - Repeat sentences for better practice and retention
- ⏯️ **Playback Controls** - Preview, Play/Pause, Next sentence navigation
- 📊 **Progress Tracking** - Track completed/total sentences and percentage

### Advanced Features
- 💾 **Smart Caching** - Redis + IndexedDB caching for instant transcript loading (30-day TTL)
- 🎯 **Persistent Progress** - localStorage saves your completed sentences per video
- 📈 **User Dashboard** - View practice history, statistics, and session details
- 🔐 **Google OAuth** - Secure authentication with Google Sign-In
- 🌐 **Multi-language Support** - Support for 100+ languages via Whisper
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- 🎨 **Clean UI** - Modern, intuitive wireframe design with ShadowTube branding

## 🎓 Demo Videos

Try these pre-cached demo videos for instant loading:

1. **Das ist DW Deutsch** - German Language Learning
   - Video ID: `mkrw9J064H8`
   - [Try it](http://localhost:3000/practice?v=mkrw9J064H8)

2. **Dua Lipa - Levitating ft. DaBaby** - English Music
   - Video ID: `TUVcZfQe-Kw`
   - [Try it](http://localhost:3000/practice?v=TUVcZfQe-Kw)

*Demo videos are pre-cached with Whisper transcripts for instant loading!*

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- YouTube IFrame API
- Dexie.js (IndexedDB)
- React Hooks (Custom)

**Backend:**
- FastAPI (Python 3.11)
- PostgreSQL (Database)
- Redis (Cache)
- SQLAlchemy (ORM)
- OpenAI Whisper API
- yt-dlp (YouTube downloads)
- Google OAuth 2.0

### Project Structure

```
shadowing-app/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── login/                   # Authentication
│   │   ├── practice/                # Practice interface
│   │   │   ├── page.tsx             # Main practice page
│   │   │   └── components/
│   │   │       └── TranscriptPanel.tsx  # Transcript with tick icons
│   │   └── dashboard/               # User statistics
│   ├── lib/
│   │   ├── hooks/
│   │   │   └── useYouTubeSync.ts    # Video-transcript sync
│   │   ├── services/
│   │   │   ├── db.ts                # IndexedDB setup
│   │   │   └── seedCache.ts         # Cache pre-warming
│   │   └── api/
│   │       └── videoService.ts      # API client
│   └── public/                      # Static assets
│
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app
│   │   ├── models.py                # SQLAlchemy models
│   │   ├── schemas.py               # Pydantic schemas
│   │   ├── config.py                # Configuration
│   │   ├── core/
│   │   │   ├── database.py          # DB connection
│   │   │   └── security.py          # Auth utilities
│   │   ├── api/
│   │   │   ├── auth.py              # Auth endpoints
│   │   │   ├── videos.py            # Video endpoints
│   │   │   └── health.py            # Health check
│   │   └── services/
│   │       └── cache.py             # Redis caching
│   ├── scripts/
│   │   └── cache_videos.py          # Pre-cache demo videos
│   ├── tests/
│   │   └── test_api.py              # API tests
│   ├── requirements.txt
│   └── docker-compose.yml
│
└── screenshots/                     # App screenshots
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Docker** and Docker Compose
- **OpenAI API Key** (for Whisper transcription)
- **Google OAuth** credentials (for authentication)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/0zturkSamet/shadowing-app.git
cd shadowing-app
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration:
# - OPENAI_API_KEY
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET
```

#### 3. Start Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify services are running
docker-compose ps
```

#### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Edit .env.local with:
# - NEXT_PUBLIC_API_URL=http://localhost:8000
# - NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### Running the Application

#### Start Backend

```bash
cd backend
python -m uvicorn app.main:app --reload
```

Backend will be available at:
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

#### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at:
- **App**: http://localhost:3000

### Pre-cache Demo Videos (Optional)

```bash
cd backend
python scripts/cache_videos.py
```

This will pre-cache the demo videos for instant loading.

## 🔌 API Endpoints

### Health Check
- `GET /health` - Check API health status

### Authentication
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout

### Videos
- `GET /api/videos/search` - Search YouTube videos
- `GET /api/videos/transcripts/{video_id}` - Get video transcript
- `POST /api/videos/transcripts/{video_id}/whisper` - Generate transcript with Whisper
- `GET /api/videos/info/{video_id}` - Get video metadata
- `POST /api/admin/cache-warmup` - Pre-cache demo videos (admin)

### Practice Sessions
- `POST /api/sessions` - Create practice session
- `GET /api/sessions` - Get user's practice sessions
- `PUT /api/sessions/{session_id}` - Update session progress
- `GET /api/sessions/stats` - Get user statistics

## 🎯 How It Works

### 1. Transcript Generation

When you paste a YouTube URL:
1. Frontend requests transcript from backend
2. Backend checks Redis cache (30-day TTL)
3. If not cached:
   - Downloads audio with yt-dlp
   - Transcribes with OpenAI Whisper API
   - Stores in Redis cache
4. Returns word-level synchronized transcript

### 2. Practice Interface

- **Video Player**: YouTube IFrame API for playback control
- **Transcript Panel**: Synchronized highlighting with auto-scroll
- **Sentence Tracking**: Click tick icon to mark completed
- **Progress Calculation**: Completed / Total sentences (%)
- **localStorage Persistence**: Saves progress per video

### 3. Caching Strategy

**Backend (Redis)**:
- Transcripts cached for 30 days
- Reduces Whisper API costs
- Instant loading for popular videos

**Frontend (IndexedDB)**:
- Client-side transcript cache
- Offline access support
- Demo videos pre-seeded

## 🧪 Testing

```bash
cd backend
pytest tests/ --cov=app --cov-report=html
```

## 📦 Deployment

### Environment Variables

**Backend (.env)**:
```bash
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
DATABASE_URL=postgresql://user:pass@localhost/shadowing
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

**Frontend (.env.local)**:
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

## 🛣️ Roadmap

- [x] YouTube video integration
- [x] OpenAI Whisper transcription
- [x] Synchronized transcript with auto-scroll
- [x] Sentence completion tracking
- [x] Loop mode for sentence practice
- [x] User authentication (Google OAuth)
- [x] Progress tracking and statistics
- [x] Smart caching (Redis + IndexedDB)
- [x] Responsive design
- [ ] Speech recognition for pronunciation feedback
- [ ] Spaced repetition algorithm
- [ ] Video bookmarking and playlists
- [ ] Social features (share progress)
- [ ] Mobile app (React Native)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI Whisper for accurate transcription
- YouTube for video platform
- FastAPI and Next.js communities

## 📞 Contact

Project Link: https://github.com/0zturkSamet/shadowing-app

---

Built with ❤️ for language learners worldwide
