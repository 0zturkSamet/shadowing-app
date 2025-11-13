# ShadowSpeak Backend

FastAPI backend for the ShadowSpeak language learning application.

## Quick Start

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Start database and cache services:
```bash
docker-compose up -d
```

3. Run the application:
```bash
python -m uvicorn app.main:app --reload
```

4. Access the API:
- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── models.py            # Database models (User, Video, UserProgress)
│   ├── schemas.py           # Pydantic validation schemas
│   ├── config.py            # Application configuration
│   ├── core/
│   │   ├── database.py      # Database connection and session
│   │   └── security.py      # Password hashing and JWT tokens
│   ├── api/
│   │   ├── auth.py          # Authentication endpoints
│   │   ├── videos.py        # Video search and transcript endpoints
│   │   └── health.py        # Health check endpoint
│   └── services/
│       └── cache.py         # Redis caching service
├── tests/
│   └── test_api.py          # API endpoint tests
├── requirements.txt         # Python dependencies
├── docker-compose.yml       # PostgreSQL and Redis services
└── .env.example            # Environment variables template
```

## API Endpoints

### Root
- `GET /` - API information

### Health
- `GET /health` - Health check

### Authentication
- `POST /api/auth/register` - Register new user (stub)
- `POST /api/auth/login` - Login user (stub)
- `GET /api/auth/me` - Get current user (stub)

### Videos
- `GET /api/videos/search` - Search videos (stub)
- `GET /api/videos/transcripts/{video_id}` - Get transcript (stub)

## Database Models

### User
- id, email, password_hash, name, learning_language, created_at

### Video
- id, youtube_id, title, language, transcript, cached_at

### UserProgress
- id, user_id, video_id, phrase_index, score, created_at

## Configuration

Environment variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `ALLOWED_ORIGINS` - CORS allowed origins
- `OPENAI_API_KEY` - OpenAI API key for Whisper transcription
- `ASSEMBLY_AI_API_KEY` - Assembly AI API key for transcription
- `ASSEMBLY_AI_REQUEST_TIMEOUT` - Request timeout in seconds (default: 300)
- `TRANSCRIPT_CACHE_TTL` - Cache TTL in seconds (default: 2592000 = 30 days)
- `ASSEMBLY_AI_MAX_RETRIES` - Max retry attempts (default: 3)
- `YOUTUBE_COOKIE_FILE` - (Optional) Path to YouTube cookies.txt for bot detection bypass

## Transcription Services

ShadowSpeak supports multiple transcription services for high-quality video transcription with word-level timestamps.

### OpenAI Whisper API

The preferred transcription service using OpenAI's Whisper model.

**Configuration**:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

**Endpoint**:
```
POST /api/videos/transcripts/whisper
```

**YouTube Bot Detection Bypass**:

YouTube may block automated downloads with "Sign in to confirm you're not a bot" errors. The application includes several bypass mechanisms:

1. **Automatic bypass** (default):
   - Uses latest yt-dlp version with bot detection countermeasures
   - Mimics real browser behavior with proper headers
   - Uses multiple player clients (Android, Web)

2. **Cookie-based authentication** (optional, for persistent issues):

   If automatic bypass fails, you can use browser cookies:

   a. Export cookies from your browser using a browser extension:
      - Chrome/Edge: "Get cookies.txt LOCALLY" extension
      - Firefox: "cookies.txt" extension

   b. Save the cookies.txt file to your server

   c. Set the environment variable:
   ```bash
   YOUTUBE_COOKIE_FILE=/path/to/cookies.txt
   ```

**Features**:
- High-quality transcription with Whisper AI
- Automatic caching (30 days)
- Language detection and hints
- Robust YouTube download with bot detection bypass

## Assembly AI Setup

ShadowSpeak also supports Assembly AI for high-quality video transcription with word-level timestamps and confidence scores.

### Getting Your API Key

1. **Sign up for Assembly AI**:
   - Visit https://www.assemblyai.com/
   - Create a free account
   - Navigate to your dashboard

2. **Get your API key**:
   - Copy your API key from the dashboard
   - The key looks like: `abc123def456...`

3. **Add to your .env file**:
   ```bash
   ASSEMBLY_AI_API_KEY=your_actual_api_key_here
   ```

### Free Tier Limits

The free tier includes:
- **600 minutes/month** - Perfect for MVP testing!
- Word-level timestamps
- Confidence scores
- Auto language detection
- No credit card required

### Cost Calculation for Production

When you're ready to scale:
- **Pay as you go**: $0.00025 per second ($0.015/min, $0.90/hour)
- **Example costs**:
  - 100 hours/month: ~$90
  - 1,000 hours/month: ~$900
  - 10,000 hours/month: ~$9,000

### Using the Transcription Service

The Assembly AI service is available at:
```
GET /api/videos/transcripts/{video_id}
```

**Features**:
- ✅ High-quality transcription with confidence scores
- ✅ Automatic caching (30 days) to minimize API costs
- ✅ Word-level timestamps for precise shadowing
- ✅ Automatic language detection
- ✅ Graceful error handling with fallbacks
- ✅ Uses yt-dlp to bypass YouTube anti-bot protections

**Example request**:
```bash
curl http://localhost:8000/api/videos/transcripts/dQw4w9WgXcQ
```

**Example response**:
```json
{
  "video_id": "dQw4w9WgXcQ",
  "title": "Never Gonna Give You Up",
  "transcript": [
    {
      "sentence_id": 1,
      "text": "We're no strangers to love.",
      "start_time": 0.5,
      "end_time": 2.3,
      "confidence": 0.95
    }
  ],
  "source": "assembly_ai",
  "cached": false,
  "processing_time": 45,
  "language": "en"
}
```

### Troubleshooting

**Error: "API key invalid"**
- Verify your API key is correct in `.env`
- Make sure there are no extra spaces or quotes
- Get a new key from https://www.assemblyai.com/dashboard

**Error: "Quota exceeded"**
- You've used all 600 free minutes this month
- Check usage at https://www.assemblyai.com/dashboard
- Upgrade to paid plan or wait until next month
- Cached transcripts still work (30-day cache)

**Error: "Video unavailable"**
- The YouTube video may be private or deleted
- Try a different video
- Check if the video URL is correct

**Error: "Network timeout"**
- Assembly AI service may be experiencing issues
- The service automatically retries 3 times with exponential backoff
- Check https://status.assemblyai.com/ for service status

**Error: "File does not appear to contain audio" or "text/html"**
- This was an issue with YouTube's anti-bot protections
- **Already fixed**: We now use yt-dlp to extract the audio URL first
- If you see this error, make sure you've installed yt-dlp: `pip install yt-dlp`

### Cache Strategy

To minimize API costs:
- ✅ Transcripts are cached for **30 days** in Redis
- ✅ Cache is checked before every API call
- ✅ Use `force_refresh=true` query param to bypass cache
- ✅ Cache keys: `transcript:{video_id}`

**Clear cache for a specific video**:
```python
from app.services.assembly_ai import clear_transcript_cache
clear_transcript_cache("dQw4w9WgXcQ")
```

## Running Tests

```bash
pytest tests/ -v
```

## Development

The current implementation includes:
- ✅ Project structure
- ✅ Database models and schemas
- ✅ Authentication utilities (password hashing, JWT)
- ✅ Redis caching service
- ✅ CORS and error handling
- ✅ Docker compose setup

TODO:
- [ ] Implement authentication endpoints
- [ ] Add YouTube API integration
- [ ] Implement transcript fetching
- [ ] Add spaced repetition algorithm
