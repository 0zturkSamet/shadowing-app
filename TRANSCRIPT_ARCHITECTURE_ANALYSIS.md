# ShadowSpeak Transcript Architecture - Comprehensive Analysis

## Executive Summary

The ShadowSpeak application implements a sophisticated transcript fetching system with intelligent fallback mechanisms. The system prioritizes Assembly AI transcriptions but gracefully falls back to YouTube transcripts and auto-captions when Assembly AI is unavailable or exceeds quota limits.

---

## 1. ARCHITECTURE OVERVIEW

### Data Flow: Video URL → Transcript Display

```
User navigates to /practice/[id]
    ↓
Frontend Practice Page Loads
    ↓
Calls /api/videos/{videoId}/smart-transcript
    ↓
Backend Smart Transcript Endpoint
    ├─ PRIORITY 1: Try Assembly AI Transcription
    │   ├─ Check database cache first
    │   ├─ Extract audio URL with yt-dlp
    │   └─ Submit to Assembly AI API
    │       ├─ Group words into sentences
    │       ├─ Cache for 30 days
    │       └─ Return with source: "assembly_ai"
    │
    ├─ PRIORITY 2: Fallback to YouTube Transcript
    │   ├─ Fetch manual transcript
    │   └─ Return with source: "transcript"
    │
    ├─ PRIORITY 3: Fallback to Manual Captions
    │   └─ Return with source: "captions"
    │
    ├─ PRIORITY 4: Fallback to Auto-Generated Captions
    │   └─ Return with source: "auto_captions"
    │
    └─ LEVEL 5: No Content Available
        └─ Return 400 error with helpful message
        └─ Frontend shows NoContentPanel with recommendations
    ↓
Frontend displays TranscriptViewer with source indicator
    ↓
User can click phrases to jump video, practice phrases
```

---

## 2. KEY COMPONENTS

### 2.1 FRONTEND - Practice Page (`/frontend/app/practice/[id]/page.tsx`)

**Purpose:** Main page where users practice with videos and transcripts

**Key Features:**
- Smart endpoint: `/api/videos/{videoId}/smart-transcript`
- Handles 4 failure scenarios:
  - 401: User not authenticated → redirect to login
  - 400: No transcript available → show NoContentPanel
  - Other errors: Display error message
- Displays source with visual indicators
- Two-panel layout: Video player (60%) + Transcript viewer (40%)
- Shows warning if content is auto-generated

**Data Flow:**
```typescript
interface TranscriptResponse {
  video_id: number;
  phrases: Array<{
    index: number;
    text: string;
    start_time: number;
    duration: number;
    language: string;
  }>;
  source: "assembly_ai" | "transcript" | "captions" | "auto_captions" | "test_seed";
  quality: "best" | "good" | "acceptable";
  language: string;
  warning?: string | null;
  is_auto_generated: boolean;
}
```

### 2.2 FRONTEND - Transcript Viewer Component (`/frontend/components/TranscriptViewer.tsx`)

**Purpose:** Display transcript with real-time highlighting and interaction

**Key Features:**
- Shows source with icon and color coding:
  - 🎤 Assembly AI: Emerald (highest quality)
  - 📝 Transcript: Green
  - 📺 Captions: Blue
  - 🤖 Auto-captions: Yellow (with warning)
- Highlights currently playing phrase
- Scrollable phrase list
- Click to jump to timestamp
- Practice mode toggle (hides text)
- Tooltips explaining source quality

**Source Styling:**
```
assembly_ai  → 🎤 "AI-Generated Transcript" → text-emerald-600, bg-emerald-50
transcript   → 📝 "Official Transcript" → text-green-600, bg-green-50
captions     → 📺 "Captions" → text-blue-600, bg-blue-50
auto_captions→ 🤖 "Auto-generated Captions" → text-yellow-600, bg-yellow-50
```

### 2.3 BACKEND - Smart Transcript Endpoint (`/backend/app/api/videos.py:410-650`)

**Endpoint:** `GET /api/videos/{video_id}/smart-transcript`

**Priority System:**

```
1. CHECK DATABASE CACHE (from any source)
   ├─ If found with confidence fields → assembly_ai
   └─ If found without confidence → transcript

2. PRIORITY 1: ASSEMBLY AI (Primary Service)
   ├─ Extract video ID from URL
   ├─ Check Redis cache (30-day TTL)
   ├─ If not cached:
   │  ├─ Extract audio URL using yt-dlp
   │  ├─ Submit to Assembly AI API
   │  ├─ Poll for completion (async)
   │  ├─ Group words into sentences
   │  └─ Cache result
   ├─ Convert to phrases format
   └─ Store in database

3. PRIORITY 2-4: YOUTUBE FALLBACK
   ├─ LEVEL 1: Try Transcript (official)
   ├─ LEVEL 2: Try Manual Captions
   ├─ LEVEL 3: Try Auto-Generated Captions
   └─ Store in database

4. ERROR HANDLING
   ├─ 400: No content from any source
   └─ 500: Service error
```

**Response Structure:**
```python
{
  "video_id": 123,
  "phrases": [
    {
      "index": 0,
      "text": "Hola, ¿cómo estás?",
      "start_time": 0.5,
      "duration": 2.3,
      "language": "es"
    }
  ],
  "source": "assembly_ai",  # or "transcript", "captions", "auto_captions"
  "quality": "best",        # or "good", "acceptable"
  "language": "es",
  "warning": null,          # or warning message
  "is_auto_generated": false
}
```

### 2.4 ASSEMBLY AI SERVICE (`/backend/app/services/assembly_ai.py`)

**Purpose:** High-quality transcription with word-level accuracy

**Features:**
- Extracts video ID from multiple YouTube URL formats
- Uses yt-dlp to bypass YouTube anti-bot protections
- Groups words into sentences intelligently
- Includes confidence scores
- 30-day Redis caching
- Proper error handling for quota/timeout/unavailable

**Key Functions:**

1. **extract_audio_url()** - Gets direct audio stream from YouTube using yt-dlp
   ```
   YouTube URL → yt-dlp → Direct audio stream URL → Assembly AI
   ```

2. **transcribe_youtube_video()** - Main transcription function
   - Accepts: YouTube URL
   - Returns: Structured transcript with word-level sentences
   - Caches result for 30 days

3. **_group_words_into_sentences()** - Intelligent grouping
   - Input: Word-level data from Assembly AI
   - Groups by sentence-ending punctuation (., !, ?, etc.)
   - Outputs: Sentence-level chunks with aggregated confidence

**Caching Strategy:**
```
Cache Key: "transcript:{video_id}"
TTL: 30 days (2592000 seconds)
Backend: Redis
```

### 2.5 YOUTUBE SERVICE (`/backend/app/services/youtube_service.py`)

**Purpose:** Search videos and fetch YouTube transcripts as fallback

**Key Methods:**

1. **get_content_for_practice()** - MASTER FALLBACK METHOD
   - Implements 4-level fallback cascade
   - Returns None if nothing available
   - Each level returns: content, source, quality, warning

2. **get_transcript()** - Fetch official transcript
   - Tries requested languages first
   - Caches for 7 days

3. **get_video_captions()** - Fetch manual captions
   - Only non-auto-generated
   - Prefers English
   - Falls back to first available

4. **get_auto_generated_captions()** - Fetch YouTube's auto-captions
   - Available for most videos
   - May contain errors
   - Includes warning in response

5. **search_videos()** - Search with pre-verification
   - Searches 5x desired results (to account for unavailable transcripts)
   - Pre-verifies each video has accessible transcript
   - Only returns videos with content

**Caching Strategy:**
```
Search results:      30 minutes
Video metadata:      24 hours
Transcripts:         7 days
```

---

## 3. DATABASE SCHEMA

### Transcript Model
```python
class Transcript(Base):
    id: Integer (PK)
    video_id: Integer (FK to videos)
    phrases: JSON  # Array of phrase objects
    created_at: DateTime
    
    # Each phrase contains:
    {
        "text": str,
        "start_time": float,
        "duration": float,
        "language": str,
        "confidence": float  # OPTIONAL (Assembly AI only)
    }
```

### Video Model
```python
class Video(Base):
    id: Integer (PK)
    youtube_id: String (UNIQUE)
    title: String
    description: Text
    language: String
    duration: Integer
    channel_name: String
    thumbnail_url: String
    view_count: Integer
    created_at: DateTime
    updated_at: DateTime
```

---

## 4. ASSEMBLY AI INTEGRATION

### How It Works

1. **Audio Extraction**
   ```
   YouTube URL → yt-dlp → Direct audio stream URL
   └─ Bypasses YouTube's anti-bot protections
   ```

2. **Transcription**
   ```
   Audio URL → Assembly AI API → Word-level transcript with timestamps
   ```

3. **Processing**
   ```
   Words → Group by sentences → Confidence aggregation → Store in DB
   ```

### Configuration

**Required Environment Variables:**
```
ASSEMBLY_AI_API_KEY=your_api_key_here
ASSEMBLY_AI_REQUEST_TIMEOUT=300  # seconds
TRANSCRIPT_CACHE_TTL=2592000     # 30 days
ASSEMBLY_AI_MAX_RETRIES=3
```

### Free Tier Limits
- **600 minutes/month** - Perfect for testing
- No credit card required
- Full features included

### Response Format
```json
{
  "video_id": "dQw4w9WgXcQ",
  "transcript": [
    {
      "sentence_id": 1,
      "text": "Hello world",
      "start_time": 0.5,
      "end_time": 2.3,
      "confidence": 0.95
    }
  ],
  "status": "completed",
  "processing_time": 45,
  "language": "en",
  "audio_duration": 120.5
}
```

---

## 5. API ENDPOINTS

### Smart Transcript Endpoint
```
GET /api/videos/{video_id}/smart-transcript
Authorization: Bearer <token>

Response (200 OK):
{
  "video_id": 123,
  "phrases": [...],
  "source": "assembly_ai",
  "quality": "best",
  "language": "es",
  "warning": null,
  "is_auto_generated": false
}

Response (400 Bad Request):
{
  "detail": "No transcript or captions available for this video from any source..."
}

Response (401 Unauthorized):
{
  "detail": "Not authenticated"
}
```

### Traditional Transcript Endpoint
```
GET /api/videos/{video_id}/transcript
Authorization: Bearer <token>

Uses intelligent fallback (YouTube: transcript → captions → auto-captions)
```

### Assembly AI Direct Endpoint
```
GET /api/videos/transcripts/{video_id}
Query Parameters:
  - force_refresh=true  (bypass cache)

Returns Assembly AI format with word-level data
```

### Recommendations Endpoint
```
GET /api/videos/{video_id}/recommendations?limit=3
Authorization: Bearer <token>

Response:
{
  "video_id": 123,
  "count": 3,
  "recommendations": [
    {
      "id": "abc123",
      "title": "...",
      "thumbnail_url": "...",
      "channel_name": "...",
      "language": "es"
    }
  ]
}
```

---

## 6. KNOWN ISSUES & BUGS

### 🔴 CRITICAL ISSUES

#### 1. API URL Configuration Inconsistency

**Location:** Frontend service configuration mismatch

**Problem:**
- Services (api.ts, videoApi.ts, playerApi.ts) set: 
  ```
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  ```
- Practice page and NoContentPanel use:
  ```
  ${process.env.NEXT_PUBLIC_API_URL}/api/videos/...
  ```

**Impact:**
- If `NEXT_PUBLIC_API_URL` is set to `http://localhost:8000`:
  - Services will request to: `http://localhost:8000/videos/...` (MISSING /api) ❌
  - Direct fetches will request to: `http://localhost:8000/api/videos/...` (CORRECT) ✅
- If `NEXT_PUBLIC_API_URL` is not set:
  - Services will use correct default: `http://localhost:8000/api` ✅
  - Direct fetches will fail: `undefined/api/videos/...` ❌

**Solution:** Standardize API URL handling:
```typescript
// Option 1: Set NEXT_PUBLIC_API_URL without /api
const baseURL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api`;

// Option 2: Services should respect the pattern
// If NEXT_PUBLIC_API_URL is set, assume it includes /api
// If not set, append /api
const baseURL = process.env.NEXT_PUBLIC_API_URL?.endsWith('/api') 
  ? process.env.NEXT_PUBLIC_API_URL
  : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api`;
```

#### 2. TranscriptViewer Type Mismatch

**Location:** `/frontend/components/TranscriptViewer.tsx` vs `/frontend/types/video.ts`

**Problem:**
- TranscriptViewer expects: `source: "assembly_ai" | "transcript" | "captions" | "auto_captions" | null`
- Practice page sends source from API: `"assembly_ai" | "transcript" | "captions" | "auto_captions" | "test_seed"`
- Type definition missing "test_seed" source
- Also missing `language` field in PhraseSchema

**Missing TypeScript Types:**
```typescript
// In /frontend/types/video.ts - PhraseSchema is incomplete
export interface PhraseSchema {
  text: string;
  start_time: number;
  duration: number;
  // MISSING: index, language
}

// Should be:
export interface PhraseSchema {
  index: number;              // MISSING
  text: string;
  start_time: number;
  duration: number;
  language?: string;          // MISSING
}

// Also TranscriptResponse is incomplete:
export interface TranscriptResponse {
  video_id: string;
  phrases: PhraseSchema[];
  // MISSING: source, quality, language, warning, is_auto_generated
}

// Should be:
export interface TranscriptResponse {
  video_id: number;
  phrases: PhraseSchema[];
  source: "assembly_ai" | "transcript" | "captions" | "auto_captions" | "test_seed";
  quality: "best" | "good" | "acceptable";
  language: string;
  warning?: string | null;
  is_auto_generated: boolean;
}
```

**Impact:**
- Type checking will fail in TypeScript strict mode
- Runtime might work due to JavaScript's dynamic typing
- Makes code fragile and hard to maintain

#### 3. NoContentPanel ID Mismatch

**Location:** `/frontend/components/NoContentPanel.tsx:73`

**Problem:**
```typescript
const handleVideoClick = (vid: Video) => {
  router.push(`/practice/${vid.id}`);  // Using vid.id
};
```

But the Video interface defines `id: string`, however the backend API returns `youtube_id` in recommendations:
```python
{
  "id": v.youtube_id,      # String, same as youtube_id
  "youtube_id": v.youtube_id,
  "title": v.title,
  ...
}
```

**Impact:**
- Route expects video ID (which is actually youtube_id from API)
- Should work if recommendation API returns the right ID
- Potential confusion between database ID and YouTube ID

### 🟡 MEDIUM ISSUES

#### 4. Missing Error Boundary in Practice Page

**Location:** `/frontend/app/practice/[id]/page.tsx`

**Problem:**
- No error boundary component
- User sees plain error message
- No recovery mechanism

**Solution:** Add error boundary or error component display

#### 5. Async/Await Pattern in transribe_youtube_video

**Location:** `/backend/app/services/assembly_ai.py:315-328`

**Problem:**
```python
transcript_job = await asyncio.to_thread(
    transcriber.transcribe,
    audio_url  
)
```

The `transcriber.transcribe()` might not be properly async and polling for completion.

**Details:**
- Assembly AI jobs are async and need polling
- If the job status is `TranscriptStatus.processing_queue` or similar, code doesn't handle waiting
- Should implement exponential backoff polling until completion

#### 6. Language Detection Inconsistency

**Location:** Multiple files

**Problem:**
- Assembly AI auto-detects language: `transcript_job.language_code`
- YouTube service uses video metadata: `video.language`
- These might not match, causing inconsistency

**Impact:**
- Phrase language might not match selected learning language
- User expecting Spanish subtitles might get English from Assembly AI

### 🟢 MINOR ISSUES

#### 7. Frontend Type Definitions

**Location:** `/frontend/types/video.ts`

**Issues:**
- `VideoResponse` missing several fields from backend response
- `UserStatsResponse` fields don't match backend implementation
- Inconsistent naming between snake_case (backend) and camelCase (frontend)

#### 8. Cache Key Format Inconsistency

**Location:** Multiple cache services

**Problem:**
- Assembly AI: `transcript:{video_id}`
- YouTube: `youtube:transcript:{video_id}`
- YouTube metadata: `youtube:metadata:{video_id}`
- YouTube search: `youtube:search:{query}:{language}:{max_results}`

**Non-critical but:** Makes debugging harder

---

## 7. DATA FLOW EXAMPLES

### Example 1: Assembly AI Success Path

```
1. User: /practice/dQw4w9WgXcQ
2. Frontend: GET /api/videos/dQw4w9WgXcQ/smart-transcript
3. Backend: Database cache miss
4. Assembly AI: Extract audio from https://www.youtube.com/watch?v=dQw4w9WgXcQ
5. yt-dlp: Get direct audio stream URL
6. Assembly AI API: Transcribe audio
   Response: 100 words with timestamps and confidence
7. Process: Group words into sentences
8. Store: Save in database with confidence field
9. Return: 
   {
     "source": "assembly_ai",
     "quality": "best",
     "phrases": [
       {
         "text": "Never gonna give you up",
         "start_time": 0.5,
         "duration": 3.2,
         "confidence": 0.98
       }
     ]
   }
10. Frontend: Display with 🎤 icon and "AI-Generated Transcript"
```

### Example 2: Assembly AI Quota Exceeded → YouTube Fallback

```
1. User: /practice/another_video
2. Backend: Assembly AI quota exceeded error
3. Fallback: Try YouTube transcript
4. YouTube API: Get official transcript (if available)
5. Response:
   {
     "source": "transcript",
     "quality": "best",
     "phrases": [...]
   }
6. Frontend: Display with 📝 icon and "Official Transcript"
```

### Example 3: Cascading Fallback to Auto-Captions

```
1. Video has no official transcript
2. Try official captions: None available
3. Try auto-captions: Found!
4. Response:
   {
     "source": "auto_captions",
     "quality": "acceptable",
     "warning": "Auto-generated - may contain errors but great for practice!",
     "is_auto_generated": true,
     "phrases": [...]
   }
5. Frontend: Display with 🤖 icon, yellow background, warning banner
```

### Example 4: No Content Available → Recommendations

```
1. Video has absolutely no transcript/captions
2. Backend: Return 400 error
3. Frontend: Show NoContentPanel
4. Frontend: Fetch recommendations
5. Backend: Get similar videos with language match
6. Display: "Try these videos instead" with 3 recommendations
7. User: Click recommendation → Navigate to new practice page
```

---

## 8. TESTING & VALIDATION

### API Testing

**Test Assembly AI Integration:**
```bash
curl -X GET http://localhost:8000/api/videos/dQw4w9WgXcQ/smart-transcript \
  -H "Authorization: Bearer <token>"
```

**Test Fallback (Video with no Assembly AI):**
```bash
curl -X GET http://localhost:8000/api/videos/jNQXAC9IVRw/smart-transcript \
  -H "Authorization: Bearer <token>"
```

**Test No Content:**
```bash
curl -X GET http://localhost:8000/api/videos/test_no_content/smart-transcript \
  -H "Authorization: Bearer <token>"
```

### Frontend Testing

**Test Practice Page Load:**
- Navigate to `/practice/dQw4w9WgXcQ`
- Should show transcript viewer with phrases
- Should see source indicator
- Should be able to click phrases to jump

**Test Source Indicators:**
- Assembly AI: Should show 🎤 emerald theme
- Transcript: Should show 📝 green theme
- Captions: Should show 📺 blue theme
- Auto-captions: Should show 🤖 yellow theme + warning

**Test No Content Handling:**
- Navigate to video with no content
- Should show NoContentPanel
- Should see 3 recommendations
- Should be able to click recommendations

---

## 9. PERFORMANCE CONSIDERATIONS

### Caching Strategy

**Assembly AI Cache:** 30 days (2,592,000 seconds)
- After first fetch, subsequent requests are instant
- Saves API costs significantly

**YouTube Cache:** 7 days
- Allows for updates if transcripts change

**Search Results:** 30 minutes
- Reasonable balance between freshness and performance

### Database Queries

**Optimized for:**
- Quick cache lookup by video_id
- Pre-filtering videos by language

**Potential Improvements:**
- Add index on `(video_id, source)` for mixed cache lookups
- Consider caching phrase indices for faster searching

---

## 10. ERROR HANDLING & USER EXPERIENCE

### Graceful Degradation

```
Assembly AI ❌ → YouTube Transcript ✅
    ↓
YouTube Transcript ❌ → Manual Captions ✅
    ↓
Manual Captions ❌ → Auto-Captions ✅
    ↓
All ❌ → Show helpful message + recommendations
```

### Error Messages

**User-Friendly:**
- "No transcript or captions available for this video from any source. Try another video with captions enabled."

**Informative:**
- Shows which source was used
- Warns if auto-generated
- Recommends similar videos

---

## 11. CONFIGURATION CHECKLIST

### Required Environment Variables

**Backend (.env):**
```
DATABASE_URL=postgresql://postgres:password@localhost/shadowing
REDIS_URL=redis://localhost:6379
YOUTUBE_API_KEY=your_youtube_api_key
ASSEMBLY_AI_API_KEY=your_assembly_ai_key
JWT_SECRET=change-this-in-production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Services Required

- PostgreSQL (running)
- Redis (running)
- YouTube Data API v3 (configured)
- Assembly AI API (configured)

---

## 12. SUMMARY

The ShadowSpeak transcript system is well-architected with:

✅ **Strengths:**
- Intelligent fallback cascade
- Multiple content sources
- Good caching strategy
- User-friendly source indicators
- Graceful error handling
- Pre-verified video search

⚠️ **Issues to Fix:**
- API URL configuration inconsistency (CRITICAL)
- TypeScript type mismatches (medium)
- Async handling in Assembly AI (medium)
- Language detection inconsistency (medium)

🚀 **Ready for Production After:**
1. Fixing API URL configuration
2. Adding proper TypeScript types
3. Testing with real Assembly AI quota
4. Adding error boundaries in UI
5. Setting up proper environment variables

