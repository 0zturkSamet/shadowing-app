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
