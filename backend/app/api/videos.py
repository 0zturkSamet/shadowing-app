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
    UserStatsResponse,
    WhisperTranscribeRequest,
    WhisperTranscriptResponse
)
from app.models import Video, Transcript, User, VideoProgress, PhraseAttempt
from app.services.youtube_service import YouTubeService
from app.services.cache import cache_service
from app.services import whisper_service


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
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
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
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error fetching video {video_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch video: {str(e)}"
        )


@router.post("/transcripts/whisper", response_model=WhisperTranscriptResponse)
async def transcribe_with_whisper(
    request: WhisperTranscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> WhisperTranscriptResponse:
    """
    Transcribe YouTube video using OpenAI Whisper API.

    This endpoint uses OpenAI Whisper for high-quality transcription.
    Results are cached for 30 days to minimize API costs.
    Only authenticated users can access this endpoint.

    Args:
        request: Whisper transcription request with YouTube URL
        current_user: Authenticated user (required)
        db: Database session

    Returns:
        WhisperTranscriptResponse: Transcript data with metadata

    Raises:
        HTTPException:
            - 400: Invalid YouTube URL
            - 401: Unauthorized (not authenticated)
            - 429: API quota exceeded
            - 503: OpenAI service unavailable
            - 500: Internal server error

    Example:
        POST /api/videos/transcripts/whisper
        {
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "language": "en",
            "force_refresh": false
        }
    """
    start_time = time.time()

    try:
        logger.info(
            f"🎙️  Whisper transcription requested by user {current_user.id} "
            f"for URL: {request.youtube_url}"
        )

        # Extract video ID for validation
        try:
            video_id = whisper_service.extract_video_id(request.youtube_url)
            logger.info(f"Extracted video ID: {video_id}")
        except ValueError as e:
            logger.error(f"Invalid YouTube URL: {request.youtube_url}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid YouTube URL: {str(e)}"
            )

        # Check cache first (unless force refresh)
        if not request.force_refresh:
            cached_result = await whisper_service.get_cached_transcript(video_id)
            if cached_result:
                response_time = int((time.time() - start_time) * 1000)  # ms
                logger.info(
                    f"✅ Whisper cache hit for {video_id} "
                    f"(response_time: {response_time}ms)"
                )
                return WhisperTranscriptResponse(**cached_result)

        # Cache miss - transcribe with Whisper
        logger.info(f"❌ Cache miss for {video_id}, transcribing with Whisper API")

        try:
            # Call Whisper service
            transcript_result = await whisper_service.transcribe_youtube_video(
                youtube_url=request.youtube_url,
                use_cache=not request.force_refresh,
                language=request.language
            )

            response_time = int((time.time() - start_time) * 1000)  # ms
            transcript_length = len(transcript_result.get("transcript", []))

            logger.info(f"✅ Whisper transcription completed for {video_id}")

            # Log performance metrics
            logger.info(
                f"📊 Whisper metrics - video_id: {video_id}, "
                f"user_id: {current_user.id}, "
                f"cache_hit: false, "
                f"response_time: {response_time}ms, "
                f"transcript_length: {transcript_length}, "
                f"processing_time: {transcript_result.get('processing_time')}s, "
                f"language: {transcript_result.get('language')}"
            )

            return WhisperTranscriptResponse(**transcript_result)

        except Exception as e:
            error_str = str(e).lower()

            # Handle quota exceeded errors (429)
            if "quota" in error_str or "rate_limit" in error_str or "insufficient_quota" in error_str:
                logger.error(f"❌ OpenAI API quota exceeded for {video_id}")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        "OpenAI API quota exceeded. "
                        "Please check your API usage and billing, or try again later."
                    )
                )

            # Handle authentication errors (401)
            if "invalid_api_key" in error_str or "authentication" in error_str:
                logger.error(f"❌ Invalid OpenAI API key")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        "OpenAI service configuration error. "
                        "Please contact support."
                    )
                )

            # Handle service unavailable errors (503)
            if "timeout" in error_str or "unavailable" in error_str or "connection" in error_str:
                logger.error(f"❌ OpenAI Whisper service unavailable for {video_id}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        "OpenAI Whisper service is currently unavailable. "
                        "This may be due to network issues or service maintenance. "
                        "Please try again in a few moments."
                    )
                )

            # Handle video not found errors (404)
            if "not found" in error_str or "not available" in error_str:
                logger.error(f"❌ Video not found or unavailable: {video_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Video not found or unavailable: {video_id}"
                )

            # Generic error
            logger.error(f"❌ Failed to transcribe video {video_id} with Whisper: {e}")
            logger.exception(e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to transcribe video with Whisper: {str(e)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in Whisper transcription: {e}")
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


@router.post("/admin/cache-warmup")
async def cache_warmup_videos(
    video_ids: list[str] = Query(
        default=["mkrw9J064H8", "TUVcZfQe-Kw"],
        description="List of video IDs to pre-cache"
    )
) -> Dict[str, Any]:
    """
    Pre-cache demo videos for production deployment.

    This endpoint triggers Whisper transcription for a list of videos
    and caches them in Redis. Useful for warming up cache before deployment.

    Args:
        video_ids: List of YouTube video IDs to cache (default: demo videos)

    Returns:
        dict: Cache warmup results with success/failure counts

    Raises:
        HTTPException: If cache warmup fails (500)

    Example:
        POST /api/videos/admin/cache-warmup?video_ids=mkrw9J064H8&video_ids=TUVcZfQe-Kw
    """
    logger.info(f"🔥 Cache warmup requested for {len(video_ids)} videos")

    results = {
        "total": len(video_ids),
        "successful": 0,
        "failed": 0,
        "videos": []
    }

    for video_id in video_ids:
        try:
            logger.info(f"Caching video: {video_id}")

            # Check if already cached
            cached = await whisper_service.get_cached_transcript(video_id)
            if cached:
                logger.info(f"✅ {video_id} already cached, skipping")
                results["successful"] += 1
                results["videos"].append({
                    "video_id": video_id,
                    "status": "already_cached",
                    "message": "Video already in cache"
                })
                continue

            # Transcribe with Whisper
            youtube_url = f"https://www.youtube.com/watch?v={video_id}"
            transcript_result = await whisper_service.transcribe_youtube_video(
                youtube_url=youtube_url,
                use_cache=True,
                language="en"
            )

            if transcript_result.get("status") == "success":
                logger.info(f"✅ Successfully cached {video_id}")
                results["successful"] += 1
                results["videos"].append({
                    "video_id": video_id,
                    "status": "success",
                    "message": "Transcript cached successfully",
                    "sentence_count": len(transcript_result.get("transcript", [])),
                    "language": transcript_result.get("language", "unknown")
                })
            else:
                logger.error(f"❌ Failed to cache {video_id}: {transcript_result.get('message')}")
                results["failed"] += 1
                results["videos"].append({
                    "video_id": video_id,
                    "status": "failed",
                    "message": transcript_result.get("message", "Unknown error")
                })

        except Exception as e:
            logger.error(f"❌ Error caching {video_id}: {e}")
            results["failed"] += 1
            results["videos"].append({
                "video_id": video_id,
                "status": "error",
                "message": str(e)
            })

    logger.info(
        f"🎉 Cache warmup complete: {results['successful']}/{results['total']} successful, "
        f"{results['failed']} failed"
    )

    return results
