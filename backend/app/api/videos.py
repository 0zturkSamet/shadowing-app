"""
Video endpoints.

This module handles video search and transcript retrieval from YouTube.
"""
import logging
import re
import time
from typing import Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas import (
    VideoResponse,
    VideoSearchResponse,
    TranscriptResponse,
    VideoCreate,
    PhraseSchema,
    VideoPlayerResponse,
    PhraseAttemptRequest,
    PhraseAttemptResponse,
    VideoProgressUpdateRequest,
    VideoProgressResponse,
    UserStatsResponse
)
from app.models import Video, Transcript, User, VideoProgress, PhraseAttempt
from app.services.youtube_service import YouTubeService
from app.services.assembly_ai import transcribe_youtube_video, get_cached_transcript
from app.services.cache import cache_service


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/videos", tags=["Videos"])


def get_youtube_service() -> YouTubeService:
    """
    Dependency to get YouTube service instance.

    Returns:
        YouTubeService: Initialized YouTube service

    Raises:
        HTTPException: If YouTube API key is not configured
    """
    from app.config import settings

    if not settings.YOUTUBE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="YouTube API key not configured. Please set YOUTUBE_API_KEY environment variable."
        )

    return YouTubeService(api_key=settings.YOUTUBE_API_KEY)


@router.get("/search", response_model=VideoSearchResponse)
async def search_videos(
    q: str = Query(..., min_length=1, description="Search query"),
    language: str = Query("en", description="Target language code (e.g., 'es', 'fr', 'de')"),
    max_results: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    skip: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db),
    youtube_service: YouTubeService = Depends(get_youtube_service)
) -> VideoSearchResponse:
    """
    Search for YouTube videos by query and language.

    This endpoint searches YouTube for videos matching the query and language,
    caches results in the database, and returns a list of videos with metadata.

    Args:
        q: Search query string
        language: Target language code (e.g., 'es', 'fr', 'de')
        max_results: Maximum number of results to return (1-50)
        skip: Number of results to skip for pagination
        db: Database session
        youtube_service: YouTube service instance

    Returns:
        VideoSearchResponse: Search results with videos and metadata

    Raises:
        HTTPException: If search fails (500) or API key not configured (503)

    Example:
        GET /api/videos/search?q=spanish+lesson&language=es&max_results=10
    """
    try:
        logger.info(f"Searching videos: query={q}, language={language}, max_results={max_results}")

        # Check if searching for test videos
        search_terms = ["test", "english", "spanish", "french", "german", "español", "français", "deutsch"]
        is_test_search = any(term in q.lower() for term in search_terms)

        if is_test_search:
            # Return test videos from database
            logger.info(f"Searching for test videos in database with language={language}")
            test_videos = db.query(Video).filter(
                Video.youtube_id.like('test_%'),
                Video.language == language
            ).limit(max_results).all()

            if test_videos:
                logger.info(f"Found {len(test_videos)} test videos")
                return VideoSearchResponse(
                    videos=test_videos,
                    total_results=len(test_videos),
                    query=q,
                    language=language
                )

        # Search YouTube
        search_results = youtube_service.search_videos(
            query=q,
            language=language,
            max_results=max_results
        )

        # Cache videos in database
        cached_videos = []
        for video_data in search_results:
            # Check if video already exists
            existing_video = db.query(Video).filter(
                Video.youtube_id == video_data['youtube_id']
            ).first()

            if existing_video:
                # Update existing video
                existing_video.title = video_data['title']
                existing_video.description = video_data.get('description', '')
                existing_video.duration = video_data['duration']
                existing_video.channel_name = video_data['channel_name']
                existing_video.thumbnail_url = video_data['thumbnail_url']
                existing_video.view_count = video_data['view_count']
                db.commit()
                db.refresh(existing_video)
                cached_videos.append(existing_video)
            else:
                # Create new video
                new_video = Video(
                    youtube_id=video_data['youtube_id'],
                    title=video_data['title'],
                    description=video_data.get('description', ''),
                    language=video_data['language'],
                    duration=video_data['duration'],
                    channel_name=video_data['channel_name'],
                    thumbnail_url=video_data['thumbnail_url'],
                    view_count=video_data['view_count']
                )
                db.add(new_video)
                db.commit()
                db.refresh(new_video)
                cached_videos.append(new_video)

        logger.info(f"Successfully cached {len(cached_videos)} videos")

        # Apply pagination
        paginated_videos = cached_videos[skip:skip + max_results]

        return VideoSearchResponse(
            videos=paginated_videos,
            total_results=len(cached_videos),
            query=q,
            language=language
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching videos: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search videos: {str(e)}"
        )


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: str,
    db: Session = Depends(get_db),
    youtube_service: YouTubeService = Depends(get_youtube_service)
) -> VideoResponse:
    """
    Get video metadata by YouTube ID.

    Retrieves video from database if cached, otherwise fetches from YouTube
    and caches it.

    Args:
        video_id: YouTube video ID (e.g., 'dQw4w9WgXcQ')
        db: Database session
        youtube_service: YouTube service instance

    Returns:
        VideoResponse: Video metadata

    Raises:
        HTTPException: If video not found (404) or fetch fails (500)

    Example:
        GET /api/videos/dQw4w9WgXcQ
    """
    try:
        logger.info(f"Fetching video: {video_id}")

        # Check database first
        video = db.query(Video).filter(Video.youtube_id == video_id).first()

        if video:
            logger.info(f"Video found in database: {video_id}")
            return video

        # Fetch from YouTube
        logger.info(f"Fetching video from YouTube: {video_id}")
        video_metadata = youtube_service.get_video_metadata(video_id)

        # Cache in database
        new_video = Video(
            youtube_id=video_metadata['youtube_id'],
            title=video_metadata['title'],
            description=video_metadata.get('description', ''),
            language=video_metadata.get('language', 'unknown'),
            duration=video_metadata['duration'],
            channel_name=video_metadata['channel_name'],
            thumbnail_url=video_metadata['thumbnail_url'],
            view_count=video_metadata['view_count']
        )
        db.add(new_video)
        db.commit()
        db.refresh(new_video)

        logger.info(f"Successfully cached video: {video_id}")
        return new_video

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching video {video_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch video: {str(e)}"
        )


@router.get("/{video_id}/transcript", response_model=TranscriptResponse)
async def get_transcript_or_captions(
    video_id: str,
    languages: Optional[str] = Query(None, description="Comma-separated language codes (e.g., 'es,en')"),
    db: Session = Depends(get_db),
    youtube_service: YouTubeService = Depends(get_youtube_service)
) -> TranscriptResponse:
    """
    Get transcript or captions for video - INTELLIGENT FALLBACK.

    Returns in priority order:
    1. Transcript (if available)
    2. Captions (if available)
    3. Auto captions (if available)
    4. Error with helpful message

    This endpoint is THE CORE of user retention!

    Args:
        video_id: YouTube video ID (e.g., 'dQw4w9WgXcQ')
        languages: Optional comma-separated language codes for transcript preference
        db: Database session
        youtube_service: YouTube service instance

    Returns:
        TranscriptResponse: Transcript/captions with timestamped phrases

    Raises:
        HTTPException: If no content available (400) or fetch fails (500)

    Example:
        GET /api/videos/dQw4w9WgXcQ/transcript
        GET /api/videos/dQw4w9WgXcQ/transcript?languages=es,en
    """
    try:
        logger.info(f"Fetching content for video (with fallback): {video_id}")

        # Get or create video record
        video = db.query(Video).filter(Video.youtube_id == video_id).first()

        if not video:
            # Fetch video metadata first
            logger.info(f"Video not in database, fetching metadata: {video_id}")
            video_metadata = youtube_service.get_video_metadata(video_id)

            video = Video(
                youtube_id=video_metadata['youtube_id'],
                title=video_metadata['title'],
                description=video_metadata.get('description', ''),
                language=video_metadata.get('language', 'unknown'),
                duration=video_metadata['duration'],
                channel_name=video_metadata['channel_name'],
                thumbnail_url=video_metadata['thumbnail_url'],
                view_count=video_metadata['view_count']
            )
            db.add(video)
            db.commit()
            db.refresh(video)

        # Check if transcript is cached
        existing_transcript = db.query(Transcript).filter(
            Transcript.video_id == video.id
        ).first()

        if existing_transcript:
            # Check if this is a test video
            is_test_video = video.youtube_id.startswith('test_')
            source_type = "test_seed" if is_test_video else "transcript"

            logger.info(f"Content found in database ({'test video' if is_test_video else 'cached'}) for video: {video_id}")

            # Build phrases with proper schema
            phrase_objects = []
            for idx, phrase in enumerate(existing_transcript.phrases):
                phrase_objects.append(PhraseSchema(
                    index=idx,
                    text=phrase['text'],
                    start_time=phrase['start_time'],
                    duration=phrase['duration'],
                    language=phrase.get('language', video.language)
                ))

            # For cached transcripts, assume best quality (they were successfully fetched before)
            return TranscriptResponse(
                video_id=video.id,
                phrases=phrase_objects,
                source=source_type,  # Mark test videos differently
                quality="best",  # Cached content is assumed to be best quality
                language=video.language,
                warning=None,
                is_auto_generated=False
            )

        # Use the NEW intelligent fallback system!
        # This is the KEY line that uses our new fallback system!
        logger.info(f"Using intelligent fallback system for {video_id}")
        result = youtube_service.get_content_for_practice(video_id)

        # Handle the result
        if result is None:
            # No content available anywhere - return helpful error
            logger.warning(f"No content available for video: {video_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No transcript or captions available for this video. Try another video - we recommend videos with captions."
            )

        # Extract the content (phrases) from the result
        # result has structure: {content: {phrases: [...], ...}, source: ..., quality: ..., warning: ...}
        content_data = result.get("content", {})
        phrases = content_data.get("phrases", [])
        source = result.get("source", "unknown")
        quality = result.get("quality", "unknown")
        warning = result.get("warning")

        # Cache the result in database
        new_transcript = Transcript(
            video_id=video.id,
            phrases=phrases
        )
        db.add(new_transcript)
        db.commit()
        db.refresh(new_transcript)

        # Log success with source information
        logger.info(f"✅ Content fetched for {video_id}: source={source}, quality={quality}, phrases={len(phrases)}")
        if warning:
            logger.info(f"⚠️  Warning: {warning}")

        # Build phrases with proper schema
        phrase_objects = []
        for idx, phrase in enumerate(phrases):
            phrase_objects.append(PhraseSchema(
                index=idx,
                text=phrase['text'],
                start_time=phrase['start_time'],
                duration=phrase['duration'],
                language=content_data.get('language', video.language)
            ))

        return TranscriptResponse(
            video_id=video.id,
            phrases=phrase_objects,
            source=source,
            quality=quality,
            language=content_data.get('language', video.language),
            warning=warning,
            is_auto_generated=(source == "auto_captions")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching content for {video_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch transcript or captions: {str(e)}"
        )


@router.get("/{video_id}/smart-transcript", response_model=TranscriptResponse)
async def get_smart_transcript(
    video_id: str,
    db: Session = Depends(get_db),
    youtube_service: YouTubeService = Depends(get_youtube_service)
) -> TranscriptResponse:
    """
    Get transcript with intelligent fallback: Assembly AI → YouTube transcript/captions.

    Priority order:
    1. Assembly AI transcription (highest quality, word-level accuracy, confidence scores)
    2. YouTube transcript (fallback if Assembly AI fails)
    3. YouTube captions (fallback if no transcript)
    4. YouTube auto-captions (final fallback)

    Results are cached to minimize API costs and improve response times.

    Args:
        video_id: YouTube video ID (e.g., 'dQw4w9WgXcQ')
        db: Database session
        youtube_service: YouTube service instance

    Returns:
        TranscriptResponse: Unified transcript with source indicator

    Raises:
        HTTPException:
            - 400: No transcript available from any source
            - 404: Video not found
            - 500: Server error

    Example:
        GET /api/videos/dQw4w9WgXcQ/smart-transcript
    """
    start_time = time.time()

    try:
        logger.info(f"🎯 Smart transcript request for video: {video_id}")

        # Get or create video record
        video = db.query(Video).filter(Video.youtube_id == video_id).first()

        if not video:
            # Fetch video metadata first
            logger.info(f"Video not in database, fetching metadata: {video_id}")
            try:
                video_metadata = youtube_service.get_video_metadata(video_id)
                video = Video(
                    youtube_id=video_metadata['youtube_id'],
                    title=video_metadata['title'],
                    description=video_metadata.get('description', ''),
                    language=video_metadata.get('language', 'unknown'),
                    duration=video_metadata['duration'],
                    channel_name=video_metadata['channel_name'],
                    thumbnail_url=video_metadata['thumbnail_url'],
                    view_count=video_metadata['view_count']
                )
                db.add(video)
                db.commit()
                db.refresh(video)
            except Exception as e:
                logger.error(f"Failed to fetch video metadata: {e}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Video not found: {video_id}"
                )

        # Check database cache first (works for both sources)
        existing_transcript = db.query(Transcript).filter(
            Transcript.video_id == video.id
        ).first()

        if existing_transcript:
            logger.info(f"✅ Database cache hit for video: {video_id}")

            # Build phrases
            phrase_objects = []
            for idx, phrase in enumerate(existing_transcript.phrases):
                phrase_objects.append(PhraseSchema(
                    index=idx,
                    text=phrase['text'],
                    start_time=phrase['start_time'],
                    duration=phrase['duration'],
                    language=phrase.get('language', video.language)
                ))

            # Determine source from cached data (default to assembly_ai if confidence exists)
            has_confidence = len(existing_transcript.phrases) > 0 and 'confidence' in existing_transcript.phrases[0]
            cached_source = "assembly_ai" if has_confidence else "transcript"

            return TranscriptResponse(
                video_id=video.id,
                phrases=phrase_objects,
                source=cached_source,
                quality="best",
                language=video.language,
                warning=None,
                is_auto_generated=False
            )

        # PRIORITY 1: Check if Assembly AI is configured and enabled
        from app.config import settings
        assembly_ai_enabled = bool(settings.ASSEMBLY_AI_API_KEY)

        if assembly_ai_enabled:
            logger.info(f"🎙️  PRIORITY 1: Attempting Assembly AI transcription for {video_id}")
            youtube_url = f"https://www.youtube.com/watch?v={video_id}"

            try:
                assembly_result = await transcribe_youtube_video(youtube_url, use_cache=True)

                if assembly_result and assembly_result.get("transcript"):
                    processing_time = int(time.time() - start_time)
                    logger.info(
                        f"✅ Assembly AI SUCCESS for {video_id} "
                        f"(sentences: {len(assembly_result['transcript'])}, time: {processing_time}s)"
                    )

                    # Convert Assembly AI format to database format
                    phrases = []
                    for sentence in assembly_result["transcript"]:
                        phrase = {
                            'text': sentence['text'],
                            'start_time': sentence['start_time'],
                            'duration': sentence['end_time'] - sentence['start_time'],
                            'language': assembly_result.get('language', video.language),
                            'confidence': sentence.get('confidence', 1.0)  # Include confidence for Assembly AI
                        }
                        phrases.append(phrase)

                    # Cache in database
                    new_transcript = Transcript(
                        video_id=video.id,
                        phrases=phrases
                    )
                    db.add(new_transcript)
                    db.commit()
                    db.refresh(new_transcript)

                    # Build response
                    phrase_objects = []
                    for idx, phrase in enumerate(phrases):
                        phrase_objects.append(PhraseSchema(
                            index=idx,
                            text=phrase['text'],
                            start_time=phrase['start_time'],
                            duration=phrase['duration'],
                            language=phrase.get('language', video.language)
                        ))

                    return TranscriptResponse(
                        video_id=video.id,
                        phrases=phrase_objects,
                        source="assembly_ai",
                        quality="best",
                        language=assembly_result.get('language', video.language),
                        warning=None,
                        is_auto_generated=False
                    )

            except Exception as assembly_error:
                logger.warning(
                    f"⚠️  Assembly AI failed for {video_id}: {str(assembly_error)[:100]}. "
                    f"Falling back to YouTube transcript system..."
                )
        else:
            logger.info(
                f"📺 Assembly AI NOT configured - using YouTube transcripts only (FREE, no downloads!)"
            )

        # PRIORITY 2-4: YouTube transcript system (or PRIMARY if Assembly AI not configured)
        logger.info(f"📺 Using YouTube transcript/captions for {video_id}")

        try:
            youtube_result = youtube_service.get_content_for_practice(video_id)

            if youtube_result is None:
                # No content available from any source
                logger.error(f"❌ No transcript available from any source for {video_id}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "No transcript or captions available for this video from any source. "
                        "Assembly AI and YouTube transcript services both failed. "
                        "Try another video with captions enabled."
                    )
                )

            # Extract content from YouTube result
            content_data = youtube_result.get("content", {})
            phrases = content_data.get("phrases", [])
            source = youtube_result.get("source", "unknown")
            quality = youtube_result.get("quality", "unknown")
            warning = youtube_result.get("warning")

            processing_time = int(time.time() - start_time)
            logger.info(
                f"✅ YouTube fallback SUCCESS for {video_id} "
                f"(source: {source}, phrases: {len(phrases)}, time: {processing_time}s)"
            )

            # Cache in database
            new_transcript = Transcript(
                video_id=video.id,
                phrases=phrases
            )
            db.add(new_transcript)
            db.commit()
            db.refresh(new_transcript)

            # Build response
            phrase_objects = []
            for idx, phrase in enumerate(phrases):
                phrase_objects.append(PhraseSchema(
                    index=idx,
                    text=phrase['text'],
                    start_time=phrase['start_time'],
                    duration=phrase['duration'],
                    language=content_data.get('language', video.language)
                ))

            return TranscriptResponse(
                video_id=video.id,
                phrases=phrase_objects,
                source=source,
                quality=quality,
                language=content_data.get('language', video.language),
                warning=warning,
                is_auto_generated=(source == "auto_captions")
            )

        except HTTPException:
            raise
        except Exception as youtube_error:
            logger.error(f"❌ YouTube fallback also failed for {video_id}: {youtube_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve transcript from all sources: {str(youtube_error)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in smart transcript for {video_id}: {e}")
        logger.exception(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )


@router.get("/transcripts/{video_id}")
async def get_assembly_ai_transcript(
    video_id: str,
    force_refresh: bool = Query(False, description="Force refresh transcript from Assembly AI"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get Assembly AI transcript for a YouTube video.

    This endpoint uses Assembly AI for high-quality transcription with
    word-level timestamps and confidence scores. Results are cached for
    30 days to minimize API costs.

    Args:
        video_id: YouTube video ID (e.g., 'dQw4w9WgXcQ')
        force_refresh: Force refresh from Assembly AI (bypass cache)
        db: Database session

    Returns:
        dict: Transcript data with metadata:
            {
                "video_id": "abc123",
                "title": "YouTube video title",
                "transcript": [
                    {
                        "sentence_id": 1,
                        "text": "Hello world",
                        "start_time": 0.5,
                        "end_time": 2.3,
                        "confidence": 0.95
                    }
                ],
                "source": "assembly_ai",
                "cached": false,
                "cached_at": "2025-11-08T10:30:00Z",
                "processing_time": 45,
                "language": "en"
            }

    Raises:
        HTTPException:
            - 404: Video not found
            - 422: Invalid video_id format
            - 503: Assembly AI service unavailable
            - 429: API quota exceeded

    Example:
        GET /api/videos/transcripts/dQw4w9WgXcQ
        GET /api/videos/transcripts/dQw4w9WgXcQ?force_refresh=true
    """
    start_time = time.time()

    try:
        # Validate video_id format
        if not video_id or len(video_id) < 10 or len(video_id) > 15:
            logger.error(f"Invalid video_id format: {video_id}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid video_id format. Expected 10-15 characters, got: {video_id}"
            )

        # Validate video_id contains only valid YouTube characters
        if not re.match(r'^[A-Za-z0-9_-]+$', video_id):
            logger.error(f"Invalid video_id characters: {video_id}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid video_id. Must contain only alphanumeric characters, hyphens, and underscores."
            )

        logger.info(f"📺 Fetching Assembly AI transcript for video: {video_id}")

        # Get video metadata from database or YouTube
        video = db.query(Video).filter(Video.youtube_id == video_id).first()

        if not video:
            logger.info(f"Video not in database, will fetch during transcription: {video_id}")
            # We'll let the transcription process handle the video
            # But we need basic info for response - construct YouTube URL
            youtube_url = f"https://www.youtube.com/watch?v={video_id}"
            video_title = None
        else:
            youtube_url = f"https://www.youtube.com/watch?v={video.youtube_id}"
            video_title = video.title

        # Check cache first (unless force refresh)
        cached_result = None
        if not force_refresh:
            cached_result = await get_cached_transcript(video_id)

        if cached_result:
            # Cache hit - return immediately
            response_time = int((time.time() - start_time) * 1000)  # ms
            logger.info(f"✅ Cache hit for {video_id} (response_time: {response_time}ms)")

            # Log cache hit metrics
            logger.info(
                f"📊 Cache metrics - video_id: {video_id}, "
                f"cache_hit: true, "
                f"response_time: {response_time}ms, "
                f"transcript_length: {len(cached_result.get('transcript', []))}"
            )

            return {
                "video_id": video_id,
                "title": video_title,
                "transcript": cached_result.get("transcript", []),
                "source": "assembly_ai",
                "cached": True,
                "cached_at": datetime.utcnow().isoformat() + "Z",
                "processing_time": cached_result.get("processing_time", 0),
                "language": cached_result.get("language", "unknown"),
                "audio_duration": cached_result.get("audio_duration")
            }

        # Cache miss - transcribe with Assembly AI
        logger.info(f"❌ Cache miss for {video_id}, transcribing with Assembly AI")

        try:
            # Call Assembly AI service
            transcript_result = await transcribe_youtube_video(youtube_url, use_cache=False)

            response_time = int((time.time() - start_time) * 1000)  # ms
            transcript_length = len(transcript_result.get("transcript", []))

            logger.info(f"✅ Assembly AI transcription completed for {video_id}")

            # Log performance metrics
            logger.info(
                f"📊 Transcription metrics - video_id: {video_id}, "
                f"cache_hit: false, "
                f"response_time: {response_time}ms, "
                f"transcript_length: {transcript_length}, "
                f"processing_time: {transcript_result.get('processing_time')}s, "
                f"language: {transcript_result.get('language')}"
            )

            # Log cache miss rate (for monitoring)
            logger.info(f"📉 Cache miss - video_id: {video_id}")

            return {
                "video_id": video_id,
                "title": video_title,
                "transcript": transcript_result.get("transcript", []),
                "source": "assembly_ai",
                "cached": False,
                "cached_at": datetime.utcnow().isoformat() + "Z",
                "processing_time": transcript_result.get("processing_time", 0),
                "language": transcript_result.get("language", "unknown"),
                "audio_duration": transcript_result.get("audio_duration")
            }

        except Exception as e:
            error_str = str(e).lower()

            # Handle quota exceeded errors (429)
            if "quota" in error_str or "limit" in error_str:
                logger.error(f"❌ API quota exceeded for {video_id}")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        "Assembly AI API quota exceeded. "
                        "The service has reached its monthly limit. "
                        "Please try again later or contact support to upgrade."
                    )
                )

            # Handle service unavailable errors (503)
            if "timeout" in error_str or "unavailable" in error_str or "connection" in error_str:
                logger.error(f"❌ Assembly AI service unavailable for {video_id}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        "Assembly AI service is currently unavailable. "
                        "This may be due to network issues or service maintenance. "
                        "Please try again in a few moments."
                    )
                )

            # Handle video not found errors (404)
            if "not found" in error_str or "unavailable" in error_str:
                logger.error(f"❌ Video not found or unavailable: {video_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Video not found or unavailable: {video_id}"
                )

            # Generic error
            logger.error(f"❌ Failed to transcribe video {video_id}: {e}")
            logger.exception(e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to transcribe video: {str(e)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error fetching transcript for {video_id}: {e}")
        logger.exception(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )


@router.get("/{video_id}/recommendations")
async def get_video_recommendations(
    video_id: str,
    limit: int = Query(3, ge=1, le=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get similar videos that have transcripts/captions.

    Used when current video has no content.
    Helps users find alternative videos to practice with.
    This prevents dead-end user experience!

    Args:
        video_id: YouTube video ID (e.g., 'dQw4w9WgXcQ')
        limit: Maximum number of recommendations (1-10, default 3)
        db: Database session
        current_user: Authenticated user

    Returns:
        dict: Recommendations with video metadata

    Raises:
        HTTPException: If video not found (404) or fetch fails (500)

    Example:
        GET /api/videos/dQw4w9WgXcQ/recommendations?limit=5
    """
    try:
        logger.info(f"Getting recommendations for video: {video_id}")

        # Step 1: Get current video to find similar ones
        video = db.query(Video).filter(Video.youtube_id == video_id).first()
        if not video:
            logger.warning(f"Video not found for recommendations: {video_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video not found: {video_id}"
            )

        # Step 2: Query similar videos
        # Criteria: same language, different video, ordered by view_count
        recommendations = db.query(Video).filter(
            Video.language == video.language,
            Video.youtube_id != video_id
        ).order_by(
            Video.view_count.desc()  # Most popular first
        ).limit(limit).all()

        # Step 3: Format response
        response = {
            "video_id": video_id,
            "count": len(recommendations),
            "recommendations": [
                {
                    "id": v.youtube_id,
                    "youtube_id": v.youtube_id,
                    "title": v.title,
                    "description": v.description[:200] if v.description else None,
                    "thumbnail_url": v.thumbnail_url,
                    "duration": v.duration,
                    "channel_name": v.channel_name,
                    "language": v.language,
                    "view_count": v.view_count
                }
                for v in recommendations
            ]
        }

        logger.info(f"Found {len(recommendations)} recommendations for {video_id}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting recommendations for {video_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recommendations: {str(e)}"
        )


@router.get("/{video_id}/player", response_model=VideoPlayerResponse)
async def get_video_player(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    youtube_service: YouTubeService = Depends(get_youtube_service)
) -> VideoPlayerResponse:
    """
    Get video player data with user progress.

    Retrieves video metadata, transcript phrases, and user's current progress
    for displaying in the video player interface.

    Args:
        video_id: YouTube video ID (e.g., 'dQw4w9WgXcQ')
        current_user: Authenticated user
        db: Database session
        youtube_service: YouTube service instance

    Returns:
        VideoPlayerResponse: Video data with phrases and user progress

    Raises:
        HTTPException: If video not found (404) or fetch fails (500)

    Example:
        GET /api/videos/dQw4w9WgXcQ/player
    """
    try:
        logger.info(f"Fetching video player data for user {current_user.id}: {video_id}")

        # Get or create video record
        video = db.query(Video).filter(Video.youtube_id == video_id).first()

        if not video:
            # Fetch video metadata from YouTube
            logger.info(f"Video not in database, fetching metadata: {video_id}")
            video_metadata = youtube_service.get_video_metadata(video_id)

            video = Video(
                youtube_id=video_metadata['youtube_id'],
                title=video_metadata['title'],
                description=video_metadata.get('description', ''),
                language=video_metadata.get('language', 'unknown'),
                duration=video_metadata['duration'],
                channel_name=video_metadata['channel_name'],
                thumbnail_url=video_metadata['thumbnail_url'],
                view_count=video_metadata['view_count']
            )
            db.add(video)
            db.commit()
            db.refresh(video)

        # Get transcript/captions using intelligent fallback
        transcript = db.query(Transcript).filter(Transcript.video_id == video.id).first()

        if not transcript:
            # Check if this is a test video (shouldn't happen if seed ran correctly)
            if video.youtube_id.startswith('test_'):
                logger.warning(f"Test video {video_id} missing transcript - this shouldn't happen!")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Test video is missing transcript. Please run the seed script."
                )

            # Use intelligent fallback system
            logger.info(f"Using intelligent fallback system for player: {video_id}")
            result = youtube_service.get_content_for_practice(video_id)

            if result is None:
                logger.warning(f"No content available for video player: {video_id}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No transcript or captions available for this video. Try another video - we recommend videos with captions."
                )

            # Extract phrases from result
            content_data = result.get("content", {})
            phrases = content_data.get("phrases", [])
            source = result.get("source", "unknown")
            quality = result.get("quality", "unknown")

            logger.info(f"✅ Content fetched for player {video_id}: source={source}, quality={quality}")

            transcript = Transcript(
                video_id=video.id,
                phrases=phrases
            )
            db.add(transcript)
            db.commit()
            db.refresh(transcript)

        # Get user's progress
        progress = db.query(VideoProgress).filter(
            VideoProgress.user_id == current_user.id,
            VideoProgress.video_id == video.id
        ).first()

        # Build phrases with index and language
        phrases = []
        for idx, phrase in enumerate(transcript.phrases):
            phrases.append(PhraseSchema(
                index=idx,
                text=phrase['text'],
                start_time=phrase['start_time'],
                duration=phrase['duration'],
                language=video.language
            ))

        # Build response
        return VideoPlayerResponse(
            id=video.id,
            youtube_id=video.youtube_id,
            title=video.title,
            duration=video.duration,
            channel_name=video.channel_name,
            phrases=phrases,
            current_progress=progress.current_timestamp if progress else 0.0,
            is_completed=progress.completed_at is not None if progress else False
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching video player data for {video_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch video player data: {str(e)}"
        )


@router.post("/{video_id}/progress", response_model=VideoProgressResponse)
async def update_video_progress(
    video_id: str,
    request: VideoProgressUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> VideoProgressResponse:
    """
    Update user's video progress.

    Records the user's current playback position and marks video as completed
    if requested. Updates total watch time.

    Args:
        video_id: YouTube video ID (e.g., 'dQw4w9WgXcQ')
        request: Progress update request with timestamp and completion status
        current_user: Authenticated user
        db: Database session

    Returns:
        VideoProgressResponse: Updated progress information

    Raises:
        HTTPException: If video not found (404) or update fails (500)

    Example:
        POST /api/videos/dQw4w9WgXcQ/progress
        {
            "current_timestamp": 45.5,
            "completed": false
        }
    """
    try:
        logger.info(f"Updating video progress for user {current_user.id}: {video_id}")

        # Get video
        video = db.query(Video).filter(Video.youtube_id == video_id).first()
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video not found: {video_id}"
            )

        # Validate timestamp
        if request.current_timestamp < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current timestamp cannot be negative"
            )

        if request.current_timestamp > video.duration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Current timestamp ({request.current_timestamp}) exceeds video duration ({video.duration})"
            )

        # Get or create progress record
        progress = db.query(VideoProgress).filter(
            VideoProgress.user_id == current_user.id,
            VideoProgress.video_id == video.id
        ).first()

        if progress:
            # Update existing progress
            old_timestamp = progress.current_timestamp
            progress.current_timestamp = request.current_timestamp
            progress.updated_at = datetime.utcnow()

            # Calculate watch time increment (if moving forward)
            if request.current_timestamp > old_timestamp:
                time_delta = int(request.current_timestamp - old_timestamp)
                # Cap the increment to 60 seconds to prevent abuse
                if time_delta > 0 and time_delta <= 60:
                    progress.total_watch_time += time_delta

            # Mark as completed if requested
            if request.completed and not progress.completed_at:
                progress.completed_at = datetime.utcnow()

        else:
            # Create new progress record
            progress = VideoProgress(
                user_id=current_user.id,
                video_id=video.id,
                current_timestamp=request.current_timestamp,
                completed_at=datetime.utcnow() if request.completed else None,
                total_watch_time=int(request.current_timestamp)
            )
            db.add(progress)

        db.commit()
        db.refresh(progress)

        logger.info(f"Updated progress for video {video_id}: timestamp={progress.current_timestamp}, completed={progress.completed_at is not None}")

        return VideoProgressResponse(
            video_id=video.id,
            current_timestamp=progress.current_timestamp,
            completed_at=progress.completed_at,
            total_watch_time=progress.total_watch_time,
            is_completed=progress.completed_at is not None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating video progress for {video_id}: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update video progress: {str(e)}"
        )


@router.post("/{video_id}/phrases/{phrase_index}", response_model=PhraseAttemptResponse)
async def record_phrase_attempt(
    video_id: str,
    phrase_index: int,
    request: PhraseAttemptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PhraseAttemptResponse:
    """
    Record a phrase practice attempt.

    Records when a user attempts to practice a specific phrase, tracking
    whether they got it correct and how many times they've attempted it.

    Args:
        video_id: YouTube video ID (e.g., 'dQw4w9WgXcQ')
        phrase_index: Index of the phrase in the transcript
        request: Attempt details (phrase_index, correct)
        current_user: Authenticated user
        db: Database session

    Returns:
        PhraseAttemptResponse: Updated attempt statistics

    Raises:
        HTTPException: If video not found (404), invalid phrase (400), or record fails (500)

    Example:
        POST /api/videos/dQw4w9WgXcQ/phrases/0
        {
            "phrase_index": 0,
            "correct": true
        }
    """
    try:
        logger.info(f"Recording phrase attempt for user {current_user.id}: video={video_id}, phrase={phrase_index}")

        # Get video
        video = db.query(Video).filter(Video.youtube_id == video_id).first()
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video not found: {video_id}"
            )

        # Get transcript to validate phrase index and get phrase text
        transcript = db.query(Transcript).filter(Transcript.video_id == video.id).first()
        if not transcript:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transcript not found for video: {video_id}"
            )

        if phrase_index < 0 or phrase_index >= len(transcript.phrases):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid phrase index: {phrase_index}. Video has {len(transcript.phrases)} phrases."
            )

        phrase_text = transcript.phrases[phrase_index]['text']

        # Check if there's an existing attempt for this phrase (most recent)
        existing_attempt = db.query(PhraseAttempt).filter(
            PhraseAttempt.user_id == current_user.id,
            PhraseAttempt.video_id == video.id,
            PhraseAttempt.phrase_index == phrase_index
        ).order_by(PhraseAttempt.timestamp.desc()).first()

        # Create new attempt record
        new_attempt = PhraseAttempt(
            user_id=current_user.id,
            video_id=video.id,
            phrase_index=phrase_index,
            phrase_text=phrase_text,
            attempts=existing_attempt.attempts + 1 if existing_attempt else 1,
            correct=request.correct,
            timestamp=datetime.utcnow()
        )
        db.add(new_attempt)
        db.commit()
        db.refresh(new_attempt)

        logger.info(f"Recorded phrase attempt: video={video_id}, phrase={phrase_index}, correct={request.correct}, total_attempts={new_attempt.attempts}")

        return PhraseAttemptResponse(
            phrase_index=phrase_index,
            attempts=new_attempt.attempts,
            correct=request.correct
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording phrase attempt for {video_id}, phrase {phrase_index}: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record phrase attempt: {str(e)}"
        )


@router.get("/stats/overview", response_model=UserStatsResponse)
async def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserStatsResponse:
    """
    Get user's learning statistics.

    Provides an overview of the user's learning progress including videos watched,
    phrases practiced, accuracy, and total watch time.

    Args:
        current_user: Authenticated user
        db: Database session

    Returns:
        UserStatsResponse: User's learning statistics

    Raises:
        HTTPException: If stats calculation fails (500)

    Example:
        GET /api/videos/stats/overview
    """
    try:
        logger.info(f"Fetching user stats for user {current_user.id}")

        # Count completed videos
        total_videos_watched = db.query(func.count(VideoProgress.id)).filter(
            VideoProgress.user_id == current_user.id,
            VideoProgress.completed_at.isnot(None)
        ).scalar() or 0

        # Count total phrases practiced (distinct phrase attempts)
        total_phrases_practiced = db.query(
            func.count(func.distinct(PhraseAttempt.video_id, PhraseAttempt.phrase_index))
        ).filter(
            PhraseAttempt.user_id == current_user.id
        ).scalar() or 0

        # Count correct phrase attempts (latest attempt for each phrase)
        # This is more complex - we need to get the latest attempt for each phrase
        # and count how many are correct
        subquery = db.query(
            PhraseAttempt.video_id,
            PhraseAttempt.phrase_index,
            func.max(PhraseAttempt.timestamp).label('max_timestamp')
        ).filter(
            PhraseAttempt.user_id == current_user.id
        ).group_by(
            PhraseAttempt.video_id,
            PhraseAttempt.phrase_index
        ).subquery()

        phrases_correct = db.query(func.count(PhraseAttempt.id)).join(
            subquery,
            (PhraseAttempt.video_id == subquery.c.video_id) &
            (PhraseAttempt.phrase_index == subquery.c.phrase_index) &
            (PhraseAttempt.timestamp == subquery.c.max_timestamp)
        ).filter(
            PhraseAttempt.user_id == current_user.id,
            PhraseAttempt.correct == True
        ).scalar() or 0

        # Calculate accuracy
        accuracy = (phrases_correct / total_phrases_practiced * 100) if total_phrases_practiced > 0 else 0.0

        # Sum total watch time
        total_watch_time = db.query(func.sum(VideoProgress.total_watch_time)).filter(
            VideoProgress.user_id == current_user.id
        ).scalar() or 0

        logger.info(f"User stats: videos={total_videos_watched}, phrases={total_phrases_practiced}, accuracy={accuracy:.2f}%")

        return UserStatsResponse(
            total_videos_watched=total_videos_watched,
            total_phrases_practiced=total_phrases_practiced,
            phrases_correct=phrases_correct,
            accuracy=round(accuracy, 2),
            total_watch_time=total_watch_time
        )

    except Exception as e:
        logger.error(f"Error fetching user stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user stats: {str(e)}"
        )
