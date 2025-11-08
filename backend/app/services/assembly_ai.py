"""
Assembly AI transcription service for YouTube videos.

This module provides integration with Assembly AI for high-quality
video transcription with word-level timestamps and confidence scores.
"""
import asyncio
import logging
import time
from typing import Dict, Optional, Any, List
from urllib.parse import urlparse, parse_qs
import re

import assemblyai as aai
from assemblyai.types import TranscriptStatus

from app.config import settings
from app.services.cache import cache_service


logger = logging.getLogger(__name__)


# Initialize Assembly AI client
def _initialize_client() -> None:
    """
    Initialize Assembly AI client with API key from settings.

    Raises:
        ValueError: If API key is not configured
    """
    if not settings.ASSEMBLY_AI_API_KEY:
        raise ValueError(
            "Assembly AI API key not configured. "
            "Please set ASSEMBLY_AI_API_KEY environment variable."
        )

    aai.settings.api_key = settings.ASSEMBLY_AI_API_KEY
    logger.info("Assembly AI client initialized successfully")


# Initialize on module load
try:
    _initialize_client()
except ValueError as e:
    logger.warning(f"Assembly AI initialization skipped: {e}")


def extract_video_id(youtube_url: str) -> str:
    """
    Extract YouTube video ID from URL.

    Supports multiple YouTube URL formats:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID

    Args:
        youtube_url: YouTube video URL

    Returns:
        str: YouTube video ID

    Raises:
        ValueError: If URL is invalid or video ID cannot be extracted

    Example:
        video_id = extract_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        # Returns: "dQw4w9WgXcQ"
    """
    # Pattern for YouTube video ID (10-15 characters, alphanumeric + underscore + hyphen)
    video_id_pattern = re.compile(r'^[A-Za-z0-9_-]{10,15}$')

    try:
        parsed_url = urlparse(youtube_url)

        # Format: https://www.youtube.com/watch?v=VIDEO_ID
        if parsed_url.hostname in ['www.youtube.com', 'youtube.com', 'm.youtube.com']:
            if parsed_url.path == '/watch':
                query_params = parse_qs(parsed_url.query)
                video_id = query_params.get('v', [None])[0]
                if video_id and video_id_pattern.match(video_id):
                    return video_id
            # Format: https://www.youtube.com/embed/VIDEO_ID
            elif parsed_url.path.startswith('/embed/'):
                video_id = parsed_url.path.split('/embed/')[1].split('?')[0]
                if video_id and video_id_pattern.match(video_id):
                    return video_id

        # Format: https://youtu.be/VIDEO_ID
        elif parsed_url.hostname == 'youtu.be':
            video_id = parsed_url.path.lstrip('/')
            if video_id and video_id_pattern.match(video_id):
                return video_id

        raise ValueError(f"Invalid YouTube URL format: {youtube_url}")

    except Exception as e:
        logger.error(f"Failed to extract video ID from URL {youtube_url}: {e}")
        raise ValueError(f"Invalid YouTube URL: {str(e)}")


def get_transcript_cache_key(video_id: str) -> str:
    """
    Generate Redis cache key for transcript.

    Args:
        video_id: YouTube video ID

    Returns:
        str: Cache key in format "transcript:{video_id}"

    Example:
        key = get_transcript_cache_key("dQw4w9WgXcQ")
        # Returns: "transcript:dQw4w9WgXcQ"
    """
    return f"transcript:{video_id}"


def _group_words_into_sentences(words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Group word-level transcripts into sentence-level chunks.

    Assembly AI provides word-level timestamps. We group them into
    sentences for better shadowing practice experience.

    Args:
        words: List of word dictionaries with text, start, end, confidence

    Returns:
        List of sentence dictionaries with aggregated data
    """
    if not words:
        return []

    sentences = []
    current_sentence = {
        'words': [],
        'start_time': words[0]['start'] / 1000.0,  # Convert ms to seconds
        'confidence_scores': []
    }

    sentence_end_markers = {'.', '!', '?', '。', '！', '？'}

    for word in words:
        current_sentence['words'].append(word['text'])
        current_sentence['confidence_scores'].append(word['confidence'])

        # Check if this word ends with sentence terminator
        if any(word['text'].endswith(marker) for marker in sentence_end_markers):
            # Complete the sentence
            sentences.append({
                'text': ' '.join(current_sentence['words']),
                'start_time': current_sentence['start_time'],
                'end_time': word['end'] / 1000.0,  # Convert ms to seconds
                'confidence': sum(current_sentence['confidence_scores']) / len(current_sentence['confidence_scores'])
            })

            # Start new sentence
            current_sentence = {
                'words': [],
                'start_time': word['end'] / 1000.0,
                'confidence_scores': []
            }

    # Add any remaining words as final sentence
    if current_sentence['words']:
        last_word = words[-1]
        sentences.append({
            'text': ' '.join(current_sentence['words']),
            'start_time': current_sentence['start_time'],
            'end_time': last_word['end'] / 1000.0,
            'confidence': sum(current_sentence['confidence_scores']) / len(current_sentence['confidence_scores'])
        })

    return sentences


async def transcribe_youtube_video(
    youtube_url: str,
    use_cache: bool = True
) -> Dict[str, Any]:
    """
    Transcribe YouTube video using Assembly AI.

    This function:
    1. Extracts video ID from URL
    2. Checks Redis cache for existing transcript
    3. If not cached, extracts audio and submits to Assembly AI
    4. Polls for completion with exponential backoff
    5. Groups words into sentences for better UX
    6. Caches result for 30 days
    7. Returns structured transcript

    Args:
        youtube_url: YouTube video URL
        use_cache: Whether to use cached transcripts (default: True)

    Returns:
        dict: Structured transcript with format:
            {
                "video_id": "youtube_id",
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
                "processing_time": 45
            }

    Raises:
        ValueError: If URL is invalid
        Exception: If API quota exceeded, network timeout, or transcription fails

    Example:
        transcript = await transcribe_youtube_video("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    """
    start_time = time.time()

    # Extract video ID
    try:
        video_id = extract_video_id(youtube_url)
        logger.info(f"Extracted video ID: {video_id}")
    except ValueError as e:
        logger.error(f"Invalid YouTube URL: {youtube_url}")
        raise ValueError(f"Invalid YouTube URL: {str(e)}")

    # Check cache
    if use_cache:
        cache_key = get_transcript_cache_key(video_id)
        cached_transcript = cache_service.get(cache_key)

        if cached_transcript:
            logger.info(f"✅ Cache hit for video: {video_id}")
            return cached_transcript

        logger.info(f"❌ Cache miss for video: {video_id}")

    # Transcribe with Assembly AI
    try:
        logger.info(f"🎙️  Starting Assembly AI transcription for video: {video_id}")
        logger.info(f"📺 YouTube URL: {youtube_url}")

        # Configure transcription settings
        config = aai.TranscriptionConfig(
            speech_model=aai.SpeechModel.best,  # Use best quality model
            language_detection=True,  # Auto-detect language
        )

        # Create transcriber
        transcriber = aai.Transcriber(config=config)

        # Submit transcription job (Assembly AI handles YouTube audio extraction)
        logger.info(f"⏳ Submitting transcription job for: {video_id}")
        transcript_job = await asyncio.to_thread(
            transcriber.transcribe,
            youtube_url
        )

        # Check for errors
        if transcript_job.status == TranscriptStatus.error:
            error_msg = transcript_job.error or "Unknown transcription error"
            logger.error(f"❌ Assembly AI transcription failed for {video_id}: {error_msg}")

            # Check for quota errors
            if "quota" in error_msg.lower() or "limit" in error_msg.lower():
                raise Exception(
                    "Assembly AI quota exceeded. Please try again later or upgrade your plan."
                )

            raise Exception(f"Transcription failed: {error_msg}")

        # Process successful transcription
        processing_time = int(time.time() - start_time)
        logger.info(f"✅ Transcription completed for {video_id} in {processing_time}s")

        # Group words into sentences
        sentences = []
        if transcript_job.words:
            sentences = _group_words_into_sentences(transcript_job.words)
            logger.info(f"📝 Grouped {len(transcript_job.words)} words into {len(sentences)} sentences")
        else:
            logger.warning(f"⚠️  No words found in transcript for {video_id}")

        # Build structured response
        result = {
            "video_id": video_id,
            "transcript": [
                {
                    "sentence_id": idx + 1,
                    "text": sentence['text'],
                    "start_time": sentence['start_time'],
                    "end_time": sentence['end_time'],
                    "confidence": round(sentence['confidence'], 4)
                }
                for idx, sentence in enumerate(sentences)
            ],
            "status": "completed",
            "processing_time": processing_time,
            "language": transcript_job.language_code or "unknown",
            "audio_duration": transcript_job.audio_duration / 1000.0 if transcript_job.audio_duration else None
        }

        # Cache for 30 days
        cache_key = get_transcript_cache_key(video_id)
        cache_ttl = settings.TRANSCRIPT_CACHE_TTL
        cache_service.set(cache_key, result, expiration=cache_ttl)
        logger.info(f"💾 Cached transcript for {video_id} (TTL: {cache_ttl}s)")

        return result

    except Exception as e:
        processing_time = int(time.time() - start_time)
        error_str = str(e).lower()

        # Handle specific error types
        if "quota" in error_str or "limit" in error_str:
            logger.error(f"❌ API quota exceeded for {video_id}")
            raise Exception(
                "Assembly AI quota exceeded. Please try again later or upgrade your plan."
            )

        if "timeout" in error_str or "timed out" in error_str:
            logger.error(f"❌ Network timeout for {video_id}")
            raise Exception(
                "Network timeout while transcribing video. Please try again."
            )

        if "not available" in error_str or "unavailable" in error_str:
            logger.error(f"❌ Video unavailable: {video_id}")
            raise Exception(
                "Video is unavailable or cannot be accessed. Please check the URL."
            )

        logger.error(f"❌ Transcription error for {video_id} ({processing_time}s): {e}")
        logger.exception(e)
        raise Exception(f"Failed to transcribe video: {str(e)}")


async def get_cached_transcript(video_id: str) -> Optional[Dict[str, Any]]:
    """
    Get cached transcript for video ID.

    Args:
        video_id: YouTube video ID

    Returns:
        Cached transcript dict or None if not found

    Example:
        transcript = await get_cached_transcript("dQw4w9WgXcQ")
    """
    cache_key = get_transcript_cache_key(video_id)
    cached = cache_service.get(cache_key)

    if cached:
        logger.info(f"✅ Retrieved cached transcript for: {video_id}")
    else:
        logger.info(f"❌ No cached transcript for: {video_id}")

    return cached


def clear_transcript_cache(video_id: str) -> bool:
    """
    Clear cached transcript for video ID.

    Useful for refreshing stale transcripts.

    Args:
        video_id: YouTube video ID

    Returns:
        bool: True if successful, False otherwise

    Example:
        success = clear_transcript_cache("dQw4w9WgXcQ")
    """
    cache_key = get_transcript_cache_key(video_id)
    result = cache_service.delete(cache_key)

    if result:
        logger.info(f"🗑️  Cleared cached transcript for: {video_id}")
    else:
        logger.warning(f"⚠️  Failed to clear cache for: {video_id}")

    return result
