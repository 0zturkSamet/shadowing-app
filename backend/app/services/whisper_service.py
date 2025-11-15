"""
OpenAI Whisper transcription service for YouTube videos.

This module provides integration with OpenAI Whisper API for high-quality
video transcription with word-level timestamps.
"""
import asyncio
import logging
import time
import tempfile
import os
from typing import Dict, Optional, Any, List
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import re

import yt_dlp
from openai import AsyncOpenAI, OpenAIError

from app.config import settings
from app.services.cache import cache_service


logger = logging.getLogger(__name__)


# Initialize OpenAI client
_openai_client: Optional[AsyncOpenAI] = None


def _initialize_client() -> AsyncOpenAI:
    """
    Initialize OpenAI client with API key from settings.

    Returns:
        AsyncOpenAI: Initialized async OpenAI client

    Raises:
        ValueError: If API key is not configured
    """
    global _openai_client

    if not settings.OPENAI_API_KEY:
        raise ValueError(
            "OpenAI API key not configured. "
            "Please set OPENAI_API_KEY environment variable."
        )

    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        logger.info("OpenAI Whisper client initialized successfully")

    return _openai_client


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


def get_whisper_cache_key(video_id: str) -> str:
    """
    Generate Redis cache key for Whisper transcript.

    Args:
        video_id: YouTube video ID

    Returns:
        str: Cache key in format "whisper:transcript:{video_id}"

    Example:
        key = get_whisper_cache_key("dQw4w9WgXcQ")
        # Returns: "whisper:transcript:dQw4w9WgXcQ"
    """
    return f"whisper:transcript:{video_id}"


async def download_audio(youtube_url: str) -> str:
    """
    Download audio from YouTube video using yt-dlp with robust fallback strategies.

    This function implements multiple strategies to bypass YouTube bot detection:
    1. Tries multiple player clients (iOS, Android, TV, Web)
    2. Supports cookie authentication from browser or file
    3. Uses exponential backoff retry logic
    4. Provides detailed error messages for troubleshooting

    Args:
        youtube_url: YouTube video URL

    Returns:
        str: Path to downloaded audio file

    Raises:
        Exception: If audio download fails after all retry attempts

    Example:
        audio_path = await download_audio("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    """
    # Define multiple download strategies with different player clients
    # Order matters: iOS and Android clients are most reliable for bypassing restrictions
    download_strategies = [
        {
            'name': 'iOS + Android clients',
            'player_clients': ['ios', 'android'],
            'skip_checks': ['webpage'],
        },
        {
            'name': 'Android + TV clients',
            'player_clients': ['android', 'tv'],
            'skip_checks': ['webpage', 'configs'],
        },
        {
            'name': 'iOS client only',
            'player_clients': ['ios'],
            'skip_checks': [],
        },
        {
            'name': 'Web + Android clients',
            'player_clients': ['web', 'android'],
            'skip_checks': ['webpage'],
        },
    ]

    last_error = None

    # Try each strategy
    for strategy_idx, strategy in enumerate(download_strategies, 1):
        try:
            logger.info(
                f"🎵 Downloading audio (Strategy {strategy_idx}/{len(download_strategies)}: "
                f"{strategy['name']})"
            )

            # Create temporary file for audio
            temp_dir = tempfile.gettempdir()
            temp_audio_path = os.path.join(temp_dir, f"whisper_audio_{int(time.time())}.m4a")

            # Base yt-dlp configuration
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': temp_audio_path.replace('.m4a', ''),
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'm4a',
                }],
                # Enhanced bot detection bypass
                'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                'extractor_args': {
                    'youtube': {
                        'player_client': strategy['player_clients'],
                        'player_skip': strategy['skip_checks'],
                    }
                },
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-us,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Sec-Fetch-Mode': 'navigate',
                },
                # Timeout and retry settings
                'socket_timeout': 30,
                'retries': 3,
            }

            # Cookie support - try multiple sources
            cookie_added = False

            # 1. Try loading cookies from browser (most reliable)
            browser_preference = os.getenv('YOUTUBE_COOKIE_BROWSER', 'chrome')
            if browser_preference:
                try:
                    ydl_opts['cookiesfrombrowser'] = (browser_preference,)
                    cookie_added = True
                    logger.info(f"Using cookies from {browser_preference} browser")
                except Exception as e:
                    logger.debug(f"Could not load cookies from browser: {e}")

            # 2. Fallback to cookie file if browser cookies not available
            if not cookie_added:
                cookie_file = os.getenv('YOUTUBE_COOKIE_FILE')
                if cookie_file and os.path.exists(cookie_file):
                    ydl_opts['cookiefile'] = cookie_file
                    cookie_added = True
                    logger.info(f"Using cookies from file: {cookie_file}")

            if not cookie_added:
                logger.warning(
                    "No cookies configured. For better reliability, consider setting "
                    "YOUTUBE_COOKIE_BROWSER=chrome or providing YOUTUBE_COOKIE_FILE"
                )

            # Download with retry logic (exponential backoff)
            max_retries = 3
            for attempt in range(1, max_retries + 1):
                try:
                    logger.info(f"📥 Download attempt {attempt}/{max_retries}")

                    def _download():
                        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                            ydl.download([youtube_url])
                        return temp_audio_path

                    audio_path = await asyncio.to_thread(_download)

                    # Verify file exists and has content
                    if not os.path.exists(audio_path):
                        raise Exception(f"Audio file not created at {audio_path}")

                    file_size = os.path.getsize(audio_path)
                    if file_size == 0:
                        raise Exception("Downloaded file is empty")

                    file_size_mb = file_size / (1024 * 1024)
                    logger.info(
                        f"✅ Successfully downloaded audio ({file_size_mb:.2f} MB) "
                        f"using {strategy['name']}"
                    )

                    return audio_path

                except Exception as retry_error:
                    error_msg = str(retry_error).lower()

                    # Check if this is a broken pipe or connection error
                    if any(err in error_msg for err in ['broken pipe', 'connection', 'errno 32']):
                        if attempt < max_retries:
                            # Exponential backoff: 2s, 4s, 8s
                            wait_time = 2 ** attempt
                            logger.warning(
                                f"⚠️  Connection error on attempt {attempt}, "
                                f"retrying in {wait_time}s... ({retry_error})"
                            )
                            await asyncio.sleep(wait_time)
                            continue

                    # For non-retryable errors or final attempt, raise
                    raise retry_error

        except Exception as e:
            last_error = e
            error_msg = str(e).lower()

            # Log the failure and try next strategy
            logger.warning(
                f"❌ Strategy {strategy_idx} ({strategy['name']}) failed: {e}"
            )

            # If this is a permanent error (not network-related), provide helpful message
            if 'sign in to confirm you' in error_msg or 'bot' in error_msg:
                logger.error(
                    "⚠️  YouTube bot detection triggered. Please:\n"
                    "   1. Set YOUTUBE_COOKIE_BROWSER=chrome (or firefox/edge)\n"
                    "   2. Or export cookies to a file and set YOUTUBE_COOKIE_FILE\n"
                    "   3. See YOUTUBE_DOWNLOAD.md for detailed instructions"
                )

            # Try next strategy if available
            if strategy_idx < len(download_strategies):
                logger.info(f"🔄 Trying next strategy...")
                await asyncio.sleep(1)  # Brief pause between strategies
                continue
            else:
                # All strategies exhausted
                break

    # All strategies failed
    error_detail = str(last_error) if last_error else "Unknown error"
    logger.error(
        f"❌ Failed to download audio after trying {len(download_strategies)} strategies. "
        f"Last error: {error_detail}"
    )

    # Provide helpful error message based on the error type
    if last_error:
        error_msg = str(last_error).lower()
        if any(err in error_msg for err in ['broken pipe', 'errno 32', 'connection']):
            raise Exception(
                "YouTube download failed due to connection issues (Broken Pipe). "
                "This is usually caused by YouTube's bot detection. "
                "Please configure browser cookies: set YOUTUBE_COOKIE_BROWSER=chrome "
                "or see YOUTUBE_DOWNLOAD.md for detailed setup instructions."
            )
        elif 'sign in' in error_msg or 'bot' in error_msg:
            raise Exception(
                "YouTube requires authentication. Please configure cookies "
                "(YOUTUBE_COOKIE_BROWSER=chrome) or see YOUTUBE_DOWNLOAD.md"
            )

    raise Exception(f"Failed to download audio from YouTube: {error_detail}")


def _format_whisper_segments(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Format Whisper API segments into sentence-level chunks.

    Whisper API provides segment-level data. We format them into
    consistent structure for the frontend.

    Args:
        segments: List of segment dictionaries from Whisper API

    Returns:
        List of formatted sentence dictionaries
    """
    if not segments:
        return []

    sentences = []

    for idx, segment in enumerate(segments):
        sentences.append({
            "sentence_id": idx + 1,
            "text": segment.get("text", "").strip(),
            "start_time": round(segment.get("start", 0.0), 2),
            "end_time": round(segment.get("end", 0.0), 2),
            "confidence": None  # Whisper API doesn't provide confidence scores
        })

    return sentences


async def transcribe_youtube_video(
    youtube_url: str,
    use_cache: bool = True,
    language: Optional[str] = None
) -> Dict[str, Any]:
    """
    Transcribe YouTube video using OpenAI Whisper API.

    This function:
    1. Extracts video ID from URL
    2. Checks Redis cache for existing transcript
    3. If not cached, downloads audio and submits to Whisper API
    4. Formats response into structured transcript
    5. Caches result for 30 days
    6. Returns structured transcript
    7. Cleans up temporary audio file

    Args:
        youtube_url: YouTube video URL
        use_cache: Whether to use cached transcripts (default: True)
        language: Language hint for better accuracy (e.g., 'en', 'es', 'fr')

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
                        "confidence": None
                    }
                ],
                "status": "completed",
                "processing_time": 45,
                "language": "en",
                "audio_duration": 180.5,
                "source": "whisper"
            }

    Raises:
        ValueError: If URL is invalid
        Exception: If API quota exceeded, network timeout, or transcription fails

    Example:
        transcript = await transcribe_youtube_video("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    """
    start_time = time.time()
    audio_path = None

    # Extract video ID
    try:
        video_id = extract_video_id(youtube_url)
        logger.info(f"Extracted video ID: {video_id}")
    except ValueError as e:
        logger.error(f"Invalid YouTube URL: {youtube_url}")
        raise ValueError(f"Invalid YouTube URL: {str(e)}")

    # Check cache
    if use_cache:
        cache_key = get_whisper_cache_key(video_id)
        cached_transcript = cache_service.get(cache_key)

        if cached_transcript:
            logger.info(f"✅ Cache hit for video: {video_id}")
            return cached_transcript

        logger.info(f"❌ Cache miss for video: {video_id}")

    # Transcribe with OpenAI Whisper
    try:
        logger.info(f"🎙️  Starting Whisper transcription for video: {video_id}")
        logger.info(f"📺 YouTube URL: {youtube_url}")

        # Initialize OpenAI client
        client = _initialize_client()

        # Download audio
        audio_path = await download_audio(youtube_url)

        # Transcribe with Whisper API
        logger.info(f"⏳ Submitting transcription job to Whisper API...")

        with open(audio_path, "rb") as audio_file:
            # Call Whisper API with timestamps
            transcription = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",  # Get detailed response with timestamps
                language=language  # Optional language hint
            )

        # Process successful transcription
        processing_time = int(time.time() - start_time)
        logger.info(f"✅ Transcription completed for {video_id} in {processing_time}s")

        # Format segments into sentences
        segments = transcription.segments if hasattr(transcription, 'segments') else []
        sentences = _format_whisper_segments(segments)
        logger.info(f"📝 Formatted {len(segments)} segments into {len(sentences)} sentences")

        # Build structured response
        result = {
            "video_id": video_id,
            "transcript": sentences,
            "status": "completed",
            "processing_time": processing_time,
            "language": transcription.language if hasattr(transcription, 'language') else language or "unknown",
            "audio_duration": transcription.duration if hasattr(transcription, 'duration') else None,
            "source": "whisper"
        }

        # Cache for 30 days
        cache_key = get_whisper_cache_key(video_id)
        cache_ttl = settings.TRANSCRIPT_CACHE_TTL
        cache_service.set(cache_key, result, expiration=cache_ttl)
        logger.info(f"💾 Cached Whisper transcript for {video_id} (TTL: {cache_ttl}s)")

        return result

    except OpenAIError as e:
        processing_time = int(time.time() - start_time)
        error_str = str(e).lower()

        # Handle specific error types
        if "quota" in error_str or "rate_limit" in error_str or "insufficient_quota" in error_str:
            logger.error(f"❌ OpenAI API quota exceeded for {video_id}")
            raise Exception(
                "OpenAI API quota exceeded. Please check your API usage and billing."
            )

        if "timeout" in error_str or "timed out" in error_str:
            logger.error(f"❌ Network timeout for {video_id}")
            raise Exception(
                "Network timeout while transcribing video. Please try again."
            )

        if "invalid_api_key" in error_str or "authentication" in error_str:
            logger.error(f"❌ Invalid OpenAI API key")
            raise Exception(
                "Invalid OpenAI API key. Please check your configuration."
            )

        logger.error(f"❌ OpenAI API error for {video_id} ({processing_time}s): {e}")
        logger.exception(e)
        raise Exception(f"Failed to transcribe video with Whisper: {str(e)}")

    except Exception as e:
        processing_time = int(time.time() - start_time)
        error_str = str(e).lower()

        # Handle generic errors
        if "not available" in error_str or "unavailable" in error_str:
            logger.error(f"❌ Video unavailable: {video_id}")
            raise Exception(
                "Video is unavailable or cannot be accessed. Please check the URL."
            )

        logger.error(f"❌ Transcription error for {video_id} ({processing_time}s): {e}")
        logger.exception(e)
        raise Exception(f"Failed to transcribe video: {str(e)}")

    finally:
        # Clean up temporary audio file
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                logger.info(f"🗑️  Cleaned up temporary audio file: {audio_path}")
            except Exception as e:
                logger.warning(f"⚠️  Failed to clean up audio file {audio_path}: {e}")


async def get_cached_transcript(video_id: str) -> Optional[Dict[str, Any]]:
    """
    Get cached Whisper transcript for video ID.

    Args:
        video_id: YouTube video ID

    Returns:
        Cached transcript dict or None if not found

    Example:
        transcript = await get_cached_transcript("dQw4w9WgXcQ")
    """
    cache_key = get_whisper_cache_key(video_id)
    cached = cache_service.get(cache_key)

    if cached:
        logger.info(f"✅ Retrieved cached Whisper transcript for: {video_id}")
    else:
        logger.info(f"❌ No cached Whisper transcript for: {video_id}")

    return cached


def clear_transcript_cache(video_id: str) -> bool:
    """
    Clear cached Whisper transcript for video ID.

    Useful for refreshing stale transcripts.

    Args:
        video_id: YouTube video ID

    Returns:
        bool: True if successful, False otherwise

    Example:
        success = clear_transcript_cache("dQw4w9WgXcQ")
    """
    cache_key = get_whisper_cache_key(video_id)
    result = cache_service.delete(cache_key)

    if result:
        logger.info(f"🗑️  Cleared cached Whisper transcript for: {video_id}")
    else:
        logger.warning(f"⚠️  Failed to clear Whisper cache for: {video_id}")

    return result
