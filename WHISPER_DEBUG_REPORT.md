# Whisper Transcription Debug Report

## Summary
Your Whisper transcription is failing with 500 errors because:
1. **Backend server is not running**
2. **Missing OpenAI API key configuration**
3. **Data structure mismatch between frontend and backend**

## Issues Found

### 1. Backend Server Not Running ❌
**Status:** CRITICAL
**Error:** Backend API at http://localhost:8000 is not responding

**Symptoms:**
```
Failed to load resource: the server responded with a status of 500
[useTranscript] Fetch cancelled or component unmounted
```

**Fix:**
```bash
# Start PostgreSQL and Redis with Docker
cd backend
docker compose up -d

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Missing .env Configuration ✅ FIXED
**Status:** FIXED
**Issue:** Backend `.env` file was missing

**What I Did:**
- Created `/backend/.env` from `.env.example`

**What You Need to Do:**
Edit `/backend/.env` and add your OpenAI API key:
```bash
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

**Get an OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and paste it in `.env`

### 3. Data Structure Mismatch ✅ FIXED
**Status:** FIXED
**Location:** `frontend/lib/services/whisperService.ts:120`

**Issue:**
Frontend expected `phrase.duration` but backend returns `phrase.end_time` and `phrase.start_time`

**Fix Applied:**
```typescript
// Before:
end_time: phrase.start_time + phrase.duration,

// After:
end_time: phrase.end_time || (phrase.start_time + (phrase.duration || 0)),
```

### 4. Component Unmounting Issue ⚠️
**Status:** WARNING
**Location:** `frontend/lib/hooks/useTranscript.ts`

**Symptoms:**
```
[useTranscript] Component unmounted
[useTranscript] Fetch cancelled or component unmounted
```

**Cause:**
- React component is being unmounted/remounted multiple times
- This is causing fetch requests to be cancelled
- Common in React Strict Mode (dev) or route changes

**Current Handling:**
The code already handles this correctly with `isMountedRef` and `currentFetchRef`. The console logs are just informational.

## Step-by-Step Fix Instructions

### Step 1: Configure OpenAI API Key
```bash
# Edit the .env file
nano backend/.env

# Add your OpenAI API key:
OPENAI_API_KEY=sk-your-key-here
```

### Step 2: Start Backend Services
```bash
cd backend

# Start PostgreSQL and Redis
docker compose up -d

# Wait for services to be healthy
docker compose ps
```

### Step 3: Install Python Dependencies
```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 4: Run Database Migrations
```bash
cd backend
alembic upgrade head
```

### Step 5: Start Backend API
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Step 6: Verify Backend is Running
Open a new terminal:
```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

### Step 7: Test Transcription
1. Open your frontend app (http://localhost:3000)
2. Navigate to a video
3. The Whisper transcription should now work

## Verification Checklist

- [ ] Backend .env file exists with OpenAI API key
- [ ] PostgreSQL is running (docker compose ps)
- [ ] Redis is running (docker compose ps)
- [ ] Backend API is responding (curl http://localhost:8000/api/health)
- [ ] Frontend can connect to backend
- [ ] Whisper transcription works without 500 errors

## Common Issues

### "OpenAI API key not configured"
**Fix:** Add `OPENAI_API_KEY=sk-...` to `backend/.env`

### "Connection refused to localhost:8000"
**Fix:** Start the backend server with `uvicorn app.main:app --reload`

### "Database connection failed"
**Fix:** Start PostgreSQL with `docker compose up -d postgres`

### "Redis connection failed"
**Fix:** Start Redis with `docker compose up -d redis`

### "ModuleNotFoundError: No module named 'fastapi'"
**Fix:** Install dependencies with `pip install -r requirements.txt`

## Architecture Overview

```
Frontend (Next.js) → Backend (FastAPI) → OpenAI Whisper API
                   ↓                    ↓
              PostgreSQL           Redis Cache
```

### Request Flow:
1. Frontend calls `/api/videos/transcripts/whisper` with YouTube URL
2. Backend extracts video ID and checks Redis cache
3. If not cached, downloads audio with yt-dlp
4. Sends audio to OpenAI Whisper API for transcription
5. Formats response and caches in Redis (30 days)
6. Returns transcript to frontend

## Files Modified

1. ✅ `/backend/.env` - Created from template
2. ✅ `/frontend/lib/services/whisperService.ts` - Fixed data structure mapping

## Next Steps

1. **Add your OpenAI API key** to `backend/.env`
2. **Start backend services** (PostgreSQL, Redis, API)
3. **Test transcription** in the frontend
4. **Monitor logs** for any additional errors

## Additional Notes

### Cost Considerations
- Whisper API costs $0.006 per minute of audio
- A 10-minute video costs ~$0.06
- Results are cached for 30 days to minimize costs
- Free tier includes $5 credit for new accounts

### Performance
- First transcription: 30-60 seconds (depends on video length)
- Cached transcription: <100ms
- Progress updates shown during transcription

### Debug Mode
To see detailed logs, check backend terminal for:
```
🎙️  Starting Whisper transcription for video: [video_id]
🎵 Downloading audio from: [url]
✅ Successfully downloaded audio (X.XX MB)
⏳ Submitting transcription job to Whisper API...
✅ Transcription completed for [video_id] in Xs
💾 Cached Whisper transcript for [video_id]
```

## Support

If you still have issues after following this guide:
1. Check backend logs for detailed error messages
2. Verify all environment variables are set
3. Test the OpenAI API key with a simple curl request
4. Check if yt-dlp can download the video (some videos are restricted)
