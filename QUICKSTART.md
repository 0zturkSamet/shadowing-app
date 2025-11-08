# 🚀 Quick Start Guide

Your app is ready to run! All branches are merged. Just follow these steps:

## Prerequisites

Make sure you have installed:
- Python 3.8+
- Node.js 16+
- PostgreSQL
- Redis

## 1️⃣ Start Required Services

```bash
# Start PostgreSQL (if not running)
# On Ubuntu/Debian:
sudo service postgresql start

# Start Redis
redis-server
```

## 2️⃣ Set Up Backend

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://postgres:password@localhost/shadowing

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production

# YouTube API (get from https://console.cloud.google.com/)
YOUTUBE_API_KEY=your_youtube_api_key_here

# Assembly AI (get from https://www.assemblyai.com/)
ASSEMBLY_AI_API_KEY=your_assembly_ai_api_key_here
ASSEMBLY_AI_REQUEST_TIMEOUT=300
ASSEMBLY_AI_MAX_RETRIES=3
TRANSCRIPT_CACHE_TTL=2592000

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# Debug
DEBUG=True
EOF

# Create database
createdb shadowing

# Run migrations (if you have any)
# python -m alembic upgrade head

# Seed test data (optional)
python scripts/seed_videos.py

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: **http://localhost:8000**

## 3️⃣ Set Up Frontend

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF

# Start development server
npm run dev
```

Frontend will be available at: **http://localhost:3000**

## 📍 Available Routes

### Frontend Pages:
- **Home**: http://localhost:3000
- **Login**: http://localhost:3000/auth/login
- **Register**: http://localhost:3000/auth/register
- **Dashboard**: http://localhost:3000/dashboard
- **Practice (Old)**: http://localhost:3000/practice/VIDEO_ID
- **Practice (New)**: http://localhost:3000/practice?v=VIDEO_ID

### Backend API:
- **Docs**: http://localhost:8000/docs
- **Health**: http://localhost:8000/api/health
- **Search Videos**: http://localhost:8000/api/videos/search?q=test
- **Get Transcript**: http://localhost:8000/api/videos/transcripts/VIDEO_ID

## 🎯 Test the New Practice Page

1. Go to: http://localhost:3000/practice?v=dQw4w9WgXcQ
2. The page will:
   - Fetch transcript using Assembly AI
   - Display video player (60% width)
   - Show scrollable transcript panel (40% width)
   - Highlight current sentence
   - Allow click-to-jump navigation

### Keyboard Shortcuts:
- `Space`: Play/Pause
- `N`: Next sentence
- `P`: Previous sentence
- `L`: Loop current sentence
- `R`: Record (placeholder)

## 🔑 Getting API Keys

### YouTube API Key:
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable YouTube Data API v3
4. Create credentials (API key)
5. Add to `backend/.env`

### Assembly AI API Key:
1. Go to https://www.assemblyai.com/
2. Sign up for free account (600 min/month free)
3. Get API key from dashboard
4. Add to `backend/.env`

## 🐛 Troubleshooting

### Backend won't start:
```bash
# Check if ports are in use
lsof -i :8000

# Check PostgreSQL is running
sudo service postgresql status

# Check Redis is running
redis-cli ping  # Should return "PONG"
```

### Frontend won't start:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check if port is in use
lsof -i :3000
```

### Transcription not working:
- Check `ASSEMBLY_AI_API_KEY` is set in `backend/.env`
- Check Redis is running
- Check backend logs for errors

## 📁 Project Structure

```
shadowing-app/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── services/     # Business logic
│   │   │   ├── assembly_ai.py      # ✨ Assembly AI integration
│   │   │   └── youtube_service.py  # YouTube API
│   │   ├── models.py     # Database models
│   │   └── main.py       # FastAPI app
│   └── requirements.txt
│
└── frontend/
    ├── app/
    │   ├── practice/     # ✨ New practice page
    │   │   ├── page.tsx
    │   │   └── components/
    │   └── dashboard/
    ├── lib/              # ✨ Utilities & hooks
    │   ├── types/
    │   ├── api/
    │   └── hooks/
    └── package.json
```

## 🎉 You're All Set!

Your shadowing app is ready with:
- ✅ Assembly AI transcription
- ✅ YouTube video integration
- ✅ New practice interface
- ✅ Real-time sentence sync
- ✅ Keyboard shortcuts
- ✅ Progress tracking

Enjoy building! 🚀
