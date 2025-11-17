# ShadowTube Backend

FastAPI backend for ShadowTube - A modern language learning application that helps users master languages through video shadowing with YouTube content.

## Features

- **OpenAI Whisper Transcription** - AI-powered video transcription with word-level timestamps
- **Smart Caching** - Redis-based caching with 30-day TTL to minimize API costs
- **YouTube Integration** - Robust video download with bot detection bypass
- **Google OAuth 2.0** - Secure authentication with Google Sign-In
- **Practice Session Tracking** - Monitor user progress and completion
- **PostgreSQL Database** - Scalable data storage for users, videos, and sessions
- **RESTful API** - Well-documented endpoints with interactive Swagger UI

## Tech Stack

- **FastAPI** - Modern, fast web framework for building APIs
- **PostgreSQL** - Relational database for persistent storage
- **Redis** - In-memory cache for transcripts and session data
- **SQLAlchemy** - Powerful ORM for database operations
- **OpenAI Whisper API** - High-quality speech-to-text transcription
- **yt-dlp** - YouTube video/audio downloader with bot bypass
- **Google OAuth 2.0** - User authentication
- **Pydantic** - Data validation and serialization
- **JWT** - Token-based authentication

## Quick Start

### Prerequisites

- Python 3.11+
- Docker and Docker Compose
- OpenAI API Key
- Google OAuth credentials

### Installation

1. **Install dependencies**:
```bash
pip install -r requirements.txt
```

2. **Configure environment variables**:
```bash
cp .env.example .env
# Edit .env with your configuration (see Configuration section below)
```

3. **Start database and cache services**:
```bash
docker-compose up -d
```

4. **Run the application**:
```bash
python -m uvicorn app.main:app --reload
```

5. **Access the API**:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI application entry point
│   ├── models.py                # SQLAlchemy database models
│   ├── schemas.py               # Pydantic validation schemas
│   ├── config.py                # Application configuration
│   ├── core/
│   │   ├── database.py          # Database connection and session
│   │   └── security.py          # Authentication and password hashing
│   ├── api/
│   │   ├── auth.py              # Google OAuth endpoints
│   │   ├── videos.py            # Video and transcript endpoints
│   │   └── health.py            # Health check endpoint
│   └── services/
│       ├── cache.py             # Redis caching service
│       ├── whisper_service.py   # OpenAI Whisper integration
│       └── youtube_service.py   # YouTube download utilities
├── scripts/
│   └── cache_videos.py          # Pre-cache demo videos
├── tests/
│   └── test_api.py              # API endpoint tests
├── migrations/                   # Alembic database migrations
├── requirements.txt             # Python dependencies
├── docker-compose.yml           # PostgreSQL and Redis services
└── .env.example                # Environment variables template
```

## API Endpoints

### Health Check
- `GET /health` - Check API and service health status

### Authentication
- `POST /api/auth/google` - Google OAuth login/register
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/logout` - Logout and invalidate session

### Videos
- `GET /api/videos/search` - Search YouTube videos
- `GET /api/videos/transcripts/{video_id}` - Get cached transcript
- `POST /api/videos/transcripts/{video_id}/whisper` - Generate Whisper transcript
- `GET /api/videos/info/{video_id}` - Get video metadata
- `POST /api/admin/cache-warmup` - Pre-cache demo videos (admin)

### Practice Sessions
- `POST /api/sessions` - Create new practice session
- `GET /api/sessions` - Get user's practice sessions
- `PUT /api/sessions/{session_id}` - Update session progress
- `GET /api/sessions/stats` - Get user statistics
- `DELETE /api/sessions/{session_id}` - Delete practice session

## Database Models

### User
```python
class User(Base):
    id: int                    # Primary key
    email: str                 # Unique email
    google_id: str            # Google OAuth ID
    name: str                 # Display name
    picture: str              # Profile picture URL
    created_at: datetime      # Account creation timestamp
```

### Video
```python
class Video(Base):
    id: int                    # Primary key
    youtube_id: str           # Unique YouTube video ID
    title: str                # Video title
    language: str             # Language code (e.g., 'en', 'de')
    transcript: JSON          # Transcript data with timestamps
    cached_at: datetime       # Cache timestamp
```

### PracticeSession
```python
class PracticeSession(Base):
    id: int                    # Primary key
    user_id: int              # Foreign key to User
    video_id: str             # YouTube video ID
    completed_sentences: int  # Number of completed sentences
    total_sentences: int      # Total sentences in video
    progress_percentage: float # Completion percentage
    started_at: datetime      # Session start time
    completed_at: datetime    # Session completion time (nullable)
```

## Configuration

Create a `.env` file in the backend directory with the following variables:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shadowing

# Redis Cache
REDIS_URL=redis://localhost:6379/0

# Authentication
JWT_SECRET=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# OpenAI Whisper
OPENAI_API_KEY=sk-your-openai-api-key

# Transcription Settings
TRANSCRIPT_CACHE_TTL=2592000  # 30 days in seconds

# YouTube Download (Optional - for bot detection bypass)
YOUTUBE_COOKIE_BROWSER=chrome  # chrome, firefox, edge, safari
# or
YOUTUBE_COOKIE_FILE=/path/to/youtube_cookies.txt
```

## Transcription with OpenAI Whisper

### How It Works

1. **User requests transcript** for a YouTube video
2. **Backend checks Redis cache** (30-day TTL)
3. **If not cached**:
   - Downloads audio from YouTube using yt-dlp
   - Sends audio to OpenAI Whisper API
   - Processes response into sentence-level segments
   - Caches result in Redis
4. **Returns transcript** with word-level timestamps

### Endpoint

```bash
POST /api/videos/transcripts/{video_id}/whisper
```

**Request Body** (optional):
```json
{
  "language": "en",  # Language hint for Whisper
  "prompt": ""       # Optional context prompt
}
```

**Response**:
```json
{
  "video_id": "mkrw9J064H8",
  "title": "Das ist DW Deutsch",
  "transcript": [
    {
      "sentence_id": 1,
      "text": "Hallo und herzlich willkommen.",
      "start_time": 0.5,
      "end_time": 2.8,
      "words": [
        {"word": "Hallo", "start": 0.5, "end": 1.0},
        {"word": "und", "start": 1.1, "end": 1.3},
        {"word": "herzlich", "start": 1.4, "end": 2.0},
        {"word": "willkommen", "start": 2.1, "end": 2.8}
      ]
    }
  ],
  "source": "whisper",
  "cached": false,
  "language": "de"
}
```

### YouTube Bot Detection Bypass

YouTube may block automated downloads with errors like "Broken Pipe" or "Sign in to confirm you're not a bot". The backend includes multiple bypass strategies:

**1. Enhanced Automatic Bypass** (default):
- Uses latest yt-dlp with advanced countermeasures
- Tries multiple player clients (iOS, Android, TV, Web)
- Implements retry logic with exponential backoff
- Mimics mobile browser behavior

**2. Cookie-Based Authentication** (for persistent issues):

**Option A: Browser Cookies (Easiest)**
```bash
# In .env file
YOUTUBE_COOKIE_BROWSER=chrome  # or firefox, edge, safari
```
- Automatically extracts cookies from your browser
- Must be signed in to YouTube in that browser

**Option B: Cookie File**
```bash
# In .env file
YOUTUBE_COOKIE_FILE=/path/to/youtube_cookies.txt
```
- Export cookies using browser extension
- Useful for servers without browser access

### Cache Strategy

To minimize OpenAI API costs:

- ✅ Transcripts cached for **30 days** in Redis
- ✅ Cache checked before every Whisper API call
- ✅ Use `force_refresh=true` to bypass cache
- ✅ Demo videos pre-cached on deployment

**Cache Keys**:
```
transcript:{video_id}           # Full transcript
transcript:{video_id}:meta      # Video metadata
```

**Pre-cache Demo Videos**:
```bash
python scripts/cache_videos.py
```

## Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run specific test file
pytest tests/test_api.py -v
```

## Development

### Implemented Features

- ✅ FastAPI application with CORS and error handling
- ✅ PostgreSQL database with SQLAlchemy ORM
- ✅ Redis caching service
- ✅ Google OAuth 2.0 authentication
- ✅ OpenAI Whisper transcription
- ✅ YouTube video download with bot bypass
- ✅ Practice session tracking
- ✅ User statistics and progress
- ✅ Admin cache warmup endpoint
- ✅ Docker Compose setup

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Deployment

### Environment Setup

1. **Set production environment variables**
2. **Run database migrations**: `alembic upgrade head`
3. **Pre-cache demo videos**: `python scripts/cache_videos.py`
4. **Start services**: `docker-compose up -d`
5. **Run application**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### Production Considerations

- Use **Gunicorn** with Uvicorn workers for production
- Set up **SSL/TLS** certificates
- Configure **PostgreSQL** with proper backups
- Monitor **Redis** memory usage
- Set up **logging** and error tracking
- Implement **rate limiting** for API endpoints
- Use **environment secrets** for API keys

## Troubleshooting

### Common Issues

**Error: "Database connection failed"**
- Ensure PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL in .env
- Verify database exists and credentials are correct

**Error: "Redis connection failed"**
- Ensure Redis is running: `docker-compose ps`
- Check REDIS_URL in .env

**Error: "OpenAI API key invalid"**
- Verify OPENAI_API_KEY in .env
- Ensure no extra spaces or quotes
- Check key at https://platform.openai.com/api-keys

**Error: "YouTube download failed"**
- Update yt-dlp: `pip install --upgrade yt-dlp`
- Try cookie-based authentication (see YouTube Bot Detection section)
- Check video is not private or deleted

**Error: "Google OAuth failed"**
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Check redirect URI matches Google Console configuration
- Ensure http://localhost:3000 is in authorized origins

## License

This project is part of the ShadowTube language learning platform.
