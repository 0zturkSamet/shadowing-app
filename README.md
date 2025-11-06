# ShadowSpeak

Language learning application using YouTube videos with shadowing technique and spaced repetition.

## Overview

ShadowSpeak helps users learn languages by practicing with YouTube video transcripts. The app combines the shadowing technique (listening and repeating) with spaced repetition algorithms to optimize language acquisition.

## Features

- **YouTube Integration**: Search and fetch videos with transcripts
- **User Authentication**: Secure registration and login with JWT tokens
- **Progress Tracking**: Monitor learning progress across videos and phrases
- **Caching**: Redis-based caching for improved performance
- **RESTful API**: Clean, well-documented FastAPI backend

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── config.py            # Configuration settings
│   ├── core/
│   │   ├── database.py      # Database connection
│   │   └── security.py      # Authentication utilities
│   ├── api/
│   │   ├── auth.py          # Auth endpoints
│   │   ├── videos.py        # Video endpoints
│   │   └── health.py        # Health check
│   └── services/
│       └── cache.py         # Redis caching
├── tests/
│   └── test_api.py          # API tests
├── requirements.txt         # Python dependencies
├── docker-compose.yml       # Local development services
└── .env.example            # Environment variables template
```

## Tech Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **PostgreSQL**: Relational database for users, videos, and progress
- **Redis**: In-memory cache for video transcripts
- **SQLAlchemy**: ORM for database operations
- **Pydantic**: Data validation and serialization
- **JWT**: Secure token-based authentication

## Getting Started

### Prerequisites

- Python 3.9+
- Docker and Docker Compose
- pip (Python package manager)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/0zturkSamet/shadowing-app.git
cd shadowing-app/backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy environment variables:
```bash
cp .env.example .env
```

5. Edit `.env` with your configuration (optional for local development)

### Running with Docker Compose

Start PostgreSQL and Redis services:
```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

Stop services:
```bash
docker-compose down
```

### Running the Application

Start the FastAPI server:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Running Tests

Run the test suite:
```bash
pytest tests/
```

Run with coverage:
```bash
pytest tests/ --cov=app --cov-report=html
```

## API Endpoints

### Health Check
- `GET /health` - Check API health status

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user profile

### Videos
- `GET /api/videos/search` - Search YouTube videos
- `GET /api/videos/transcripts/{video_id}` - Get video transcript

## Development Roadmap

- [ ] Implement authentication endpoints
- [ ] Add YouTube API integration
- [ ] Implement transcript fetching and parsing
- [ ] Add spaced repetition algorithm
- [ ] Create user progress tracking
- [ ] Build frontend application
- [ ] Add speech recognition for shadowing practice
- [ ] Implement difficulty ratings
- [ ] Add bookmarking and favorites

## Environment Variables

See `.env.example` for all available configuration options:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Project Link: https://github.com/0zturkSamet/shadowing-app

---

Built with ❤️ for language learners
