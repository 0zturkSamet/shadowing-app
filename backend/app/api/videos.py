"""
Video endpoints.

This module handles video search and transcript retrieval from YouTube.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import (
    VideoResponse,
    VideoSearchResponse,
    TranscriptResponse,
    VideoCreate,
    PhraseSchema
)
from app.models import Video, Transcript
from app.services.youtube_service import YouTubeService


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
async def get_transcript(
    video_id: str,
    languages: Optional[str] = Query(None, description="Comma-separated language codes (e.g., 'es,en')"),
    db: Session = Depends(get_db),
    youtube_service: YouTubeService = Depends(get_youtube_service)
) -> TranscriptResponse:
    """
    Get transcript for a YouTube video.

    Retrieves transcript from database if cached, otherwise fetches from YouTube
    and caches it. Also ensures the video metadata is cached.

    Args:
        video_id: YouTube video ID (e.g., 'dQw4w9WgXcQ')
        languages: Optional comma-separated language codes for transcript preference
        db: Database session
        youtube_service: YouTube service instance

    Returns:
        TranscriptResponse: Transcript with timestamped phrases

    Raises:
        HTTPException: If video not found (404), transcript unavailable (400),
                      or fetch fails (500)

    Example:
        GET /api/videos/dQw4w9WgXcQ/transcript
        GET /api/videos/dQw4w9WgXcQ/transcript?languages=es,en
    """
    try:
        logger.info(f"Fetching transcript for video: {video_id}")

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
            logger.info(f"Transcript found in database for video: {video_id}")
            return TranscriptResponse(
                video_id=video.id,
                phrases=[PhraseSchema(**phrase) for phrase in existing_transcript.phrases]
            )

        # Fetch transcript from YouTube
        logger.info(f"Fetching transcript from YouTube: {video_id}")
        language_list = languages.split(',') if languages else None
        transcript_data = youtube_service.get_transcript(video_id, language_list)

        # Cache transcript in database
        new_transcript = Transcript(
            video_id=video.id,
            phrases=transcript_data['phrases']
        )
        db.add(new_transcript)
        db.commit()
        db.refresh(new_transcript)

        logger.info(f"Successfully cached transcript for video: {video_id}")

        return TranscriptResponse(
            video_id=video.id,
            phrases=[PhraseSchema(**phrase) for phrase in new_transcript.phrases]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching transcript for {video_id}: {e}", exc_info=True)

        # Check if it's a transcript availability issue
        error_str = str(e).lower()
        if 'disabled' in error_str or 'not found' in error_str or 'unavailable' in error_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transcript not available for this video: {str(e)}"
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch transcript: {str(e)}"
        )
