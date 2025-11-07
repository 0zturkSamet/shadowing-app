"""
YouTube API service for video search and transcript retrieval.

This module provides integration with YouTube Data API v3 and
YouTube Transcript API for searching videos and fetching transcripts.
"""
import logging
from typing import List, Dict, Optional, Any
import isodate
from xml.etree.ElementTree import ParseError

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable
)

from app.services.cache import cache_service


logger = logging.getLogger(__name__)


class YouTubeService:
    """
    Service for interacting with YouTube API.

    Provides methods for searching videos, fetching metadata,
    and retrieving transcripts with intelligent caching.
    """

    def __init__(self, api_key: str):
        """
        Initialize YouTube service with API key.

        Args:
            api_key: YouTube Data API v3 key
        """
        self.api_key = api_key
        self.youtube = build('youtube', 'v3', developerKey=api_key)
        logger.info("YouTubeService initialized successfully")

    def search_videos(
        self,
        query: str,
        language: str = "en",
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search YouTube for videos matching query and language.

        Args:
            query: Search query string
            language: Target language code (e.g., 'es', 'fr', 'de')
            max_results: Maximum number of results (1-50)

        Returns:
            List of video dictionaries with metadata

        Raises:
            Exception: If YouTube API request fails

        Example:
            videos = service.search_videos("spanish lesson", "es", 10)
        """
        # Check cache first
        cache_key = f"youtube:search:{query}:{language}:{max_results}"
        cached_results = cache_service.get(cache_key)

        if cached_results:
            logger.info(f"Cache hit for search: {query}")
            return cached_results

        try:
            # Search for MORE videos initially to filter for transcript availability
            # Request 3x the desired amount to account for videos without transcripts
            search_max = min(max_results * 3, 50)  # YouTube API max is 50

            # Search for videos
            search_response = self.youtube.search().list(
                q=query,
                part='id,snippet',
                type='video',
                relevanceLanguage=language,
                maxResults=search_max,
                videoCaption='closedCaption',  # Only videos with captions
                videoDuration='medium'  # Prefer videos 4-20 minutes (better for learning)
            ).execute()

            video_ids = [
                item['id']['videoId']
                for item in search_response.get('items', [])
            ]

            if not video_ids:
                logger.warning(f"No videos found for query: {query}")
                return []

            # Get detailed video information
            videos_response = self.youtube.videos().list(
                part='snippet,contentDetails,statistics',
                id=','.join(video_ids)
            ).execute()

            results = []
            for item in videos_response.get('items', []):
                try:
                    # Parse duration from ISO 8601 format
                    duration_str = item['contentDetails']['duration']
                    duration_seconds = int(isodate.parse_duration(duration_str).total_seconds())

                    # Skip very short videos (< 30 seconds) - unlikely to be useful for learning
                    if duration_seconds < 30:
                        continue

                    video_data = {
                        'video_id': item['id'],
                        'youtube_id': item['id'],
                        'title': item['snippet']['title'],
                        'description': item['snippet'].get('description', ''),
                        'duration': duration_seconds,
                        'channel_name': item['snippet']['channelTitle'],
                        'thumbnail_url': item['snippet']['thumbnails']['high']['url'],
                        'view_count': int(item['statistics'].get('viewCount', 0)),
                        'language': language
                    }
                    results.append(video_data)

                    # Stop once we have enough results
                    if len(results) >= max_results:
                        break

                except (KeyError, ValueError) as e:
                    logger.warning(f"Error parsing video {item.get('id')}: {e}")
                    continue

            # Cache results for 30 minutes
            cache_service.set(cache_key, results, expiration=1800)
            logger.info(f"Found {len(results)} videos for query: {query}")

            return results

        except HttpError as e:
            logger.error(f"YouTube API error: {e}")
            raise Exception(f"Failed to search videos: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in search_videos: {e}")
            raise Exception(f"Failed to search videos: {str(e)}")

    def get_video_metadata(self, video_id: str) -> Dict[str, Any]:
        """
        Get metadata for a single YouTube video.

        Args:
            video_id: YouTube video ID

        Returns:
            Dictionary with video metadata

        Raises:
            Exception: If video not found or API request fails

        Example:
            metadata = service.get_video_metadata("dQw4w9WgXcQ")
        """
        # Check cache first
        cache_key = f"youtube:metadata:{video_id}"
        cached_metadata = cache_service.get(cache_key)

        if cached_metadata:
            logger.info(f"Cache hit for metadata: {video_id}")
            return cached_metadata

        try:
            response = self.youtube.videos().list(
                part='snippet,contentDetails,statistics',
                id=video_id
            ).execute()

            items = response.get('items', [])
            if not items:
                raise Exception(f"Video not found: {video_id}")

            item = items[0]

            # Parse duration
            duration_str = item['contentDetails']['duration']
            duration_seconds = int(isodate.parse_duration(duration_str).total_seconds())

            metadata = {
                'video_id': video_id,
                'youtube_id': video_id,
                'title': item['snippet']['title'],
                'description': item['snippet'].get('description', ''),
                'duration': duration_seconds,
                'channel_name': item['snippet']['channelTitle'],
                'thumbnail_url': item['snippet']['thumbnails']['high']['url'],
                'view_count': int(item['statistics'].get('viewCount', 0)),
                'language': item['snippet'].get('defaultLanguage', 'unknown')
            }

            # Cache for 24 hours
            cache_service.set(cache_key, metadata, expiration=86400)
            logger.info(f"Retrieved metadata for video: {video_id}")

            return metadata

        except HttpError as e:
            logger.error(f"YouTube API error for video {video_id}: {e}")
            raise Exception(f"Failed to get video metadata: {str(e)}")
        except Exception as e:
            logger.error(f"Error getting video metadata: {e}")
            raise Exception(f"Failed to get video metadata: {str(e)}")

    def get_transcript(
        self,
        video_id: str,
        languages: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Fetch transcript for a YouTube video.

        Args:
            video_id: YouTube video ID
            languages: Preferred languages (e.g., ['es', 'en'])

        Returns:
            Dictionary with video_id and phrases list

        Raises:
            Exception: If transcript is unavailable or fetch fails

        Example:
            transcript = service.get_transcript("dQw4w9WgXcQ", ["es", "en"])
        """
        # Check cache first
        cache_key = f"youtube:transcript:{video_id}"
        cached_transcript = cache_service.get(cache_key)

        if cached_transcript:
            logger.info(f"Cache hit for transcript: {video_id}")
            return cached_transcript

        try:
            # Fetch transcript
            if languages:
                transcript_list = YouTubeTranscriptApi.get_transcript(
                    video_id,
                    languages=languages
                )
            else:
                # Try to get any available transcript
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id)

            # Parse transcript into phrases
            phrases = []
            for entry in transcript_list:
                phrase = {
                    'text': entry['text'],
                    'start_time': entry['start'],
                    'duration': entry['duration']
                }
                phrases.append(phrase)

            result = {
                'video_id': video_id,
                'phrases': phrases
            }

            # Cache transcript indefinitely in Redis (with 7 day expiration for cleanup)
            cache_service.set(cache_key, result, expiration=604800)
            logger.info(f"Retrieved transcript with {len(phrases)} phrases for video: {video_id}")

            return result

        except TranscriptsDisabled:
            error_msg = f"Transcripts are disabled for this video. The video owner may have turned off captions."
            logger.warning(f"{error_msg} (video_id: {video_id})")
            raise Exception(error_msg)
        except NoTranscriptFound:
            error_msg = f"No transcript available for this video. Please try a different video with captions enabled."
            logger.warning(f"{error_msg} (video_id: {video_id})")
            raise Exception(error_msg)
        except VideoUnavailable:
            error_msg = f"Video is unavailable or has been removed."
            logger.warning(f"{error_msg} (video_id: {video_id})")
            raise Exception(error_msg)
        except ParseError as e:
            # XML parsing error - usually means no transcript data available
            error_msg = f"No transcript data available for this video. The video may not have captions."
            logger.warning(f"{error_msg} (video_id: {video_id}, parse_error: {e})")
            raise Exception(error_msg)
        except Exception as e:
            # Catch any other errors including generic XML/parsing issues
            error_str = str(e).lower()
            if 'no element found' in error_str or 'xml' in error_str or 'parse' in error_str:
                error_msg = f"No transcript data available for this video. The video may not have captions."
                logger.warning(f"{error_msg} (video_id: {video_id}, error: {e})")
                raise Exception(error_msg)

            logger.error(f"Unexpected error fetching transcript for {video_id}: {e}")
            raise Exception(f"Failed to fetch transcript: {str(e)}")

    def get_available_transcripts(self, video_id: str) -> List[Dict[str, str]]:
        """
        Get list of available transcript languages for a video.

        Args:
            video_id: YouTube video ID

        Returns:
            List of available transcript language codes and names

        Example:
            languages = service.get_available_transcripts("dQw4w9WgXcQ")
        """
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

            available = []
            for transcript in transcript_list:
                available.append({
                    'language_code': transcript.language_code,
                    'language': transcript.language,
                    'is_generated': transcript.is_generated,
                    'is_translatable': transcript.is_translatable
                })

            logger.info(f"Found {len(available)} transcripts for video: {video_id}")
            return available

        except Exception as e:
            logger.error(f"Error listing transcripts for {video_id}: {e}")
            return []

    def get_video_captions(self, video_id: str) -> Optional[Dict]:
        """
        Get manual (non-auto-generated) captions from YouTube.

        Attempts to get manual captions in this order:
        1. English captions (if available)
        2. First available language captions

        Returns:
            Dict with:
              - phrases: list of caption phrases with timestamps
              - language: language code (en, es, fr, de, ja, etc)
              - is_auto_generated: False
              - source: "captions"
            None: if no manual captions available

        Raises:
            Exception: if YouTube API fails (logged and returns None)
        """
        try:
            logger.info(f"📺 Attempting to fetch manual captions for video: {video_id}")

            # List all available transcripts
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

            # Filter for manual (non-generated) transcripts only
            manual_transcripts = []
            for transcript in transcript_list:
                if not transcript.is_generated:
                    manual_transcripts.append(transcript)
                    logger.debug(f"Found manual caption: {transcript.language_code} ({transcript.language})")

            if not manual_transcripts:
                logger.info(f"No manual captions available for video: {video_id}")
                return None

            # Try to find English captions first
            selected_transcript = None
            for transcript in manual_transcripts:
                if transcript.language_code.startswith('en'):
                    selected_transcript = transcript
                    logger.info(f"✅ Found English manual captions for {video_id}")
                    break

            # If no English, use first available
            if not selected_transcript:
                selected_transcript = manual_transcripts[0]
                logger.info(f"✅ Using {selected_transcript.language_code} manual captions for {video_id}")

            # Fetch the caption data
            caption_data = selected_transcript.fetch()

            # Convert to phrase format
            phrases = []
            for entry in caption_data:
                phrase = {
                    'text': entry['text'],
                    'start_time': entry['start'],
                    'duration': entry['duration']
                }
                phrases.append(phrase)

            result = {
                "phrases": phrases,
                "language": selected_transcript.language_code,
                "is_auto_generated": False,
                "source": "captions"
            }

            logger.info(f"✅ Retrieved {len(phrases)} manual caption phrases for {video_id}")
            return result

        except TranscriptsDisabled:
            logger.warning(f"Transcripts/captions disabled for {video_id}")
            return None
        except NoTranscriptFound:
            logger.warning(f"No captions found for {video_id}")
            return None
        except VideoUnavailable:
            logger.warning(f"Video unavailable: {video_id}")
            return None
        except Exception as e:
            logger.warning(f"Failed to get manual captions for {video_id}: {str(e)}")
            logger.debug(f"Exception details: {e}", exc_info=True)
            return None

    def get_auto_generated_captions(self, video_id: str) -> Optional[Dict]:
        """
        Get auto-generated captions from YouTube.

        Auto-generated captions are available for most videos
        even if manual captions aren't available.

        Returns:
            Dict with:
              - phrases: list of caption phrases with timestamps
              - language: language code (en, es, fr, de, ja, etc)
              - is_auto_generated: True
              - source: "auto_captions"
            None: if no auto-generated captions available
        """
        try:
            logger.info(f"🤖 Attempting to fetch auto-generated captions for: {video_id}")

            # List all available transcripts
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

            # Filter for auto-generated transcripts only
            auto_transcripts = []
            for transcript in transcript_list:
                if transcript.is_generated:
                    auto_transcripts.append(transcript)
                    logger.debug(f"Found auto-generated caption: {transcript.language_code} ({transcript.language})")

            if not auto_transcripts:
                logger.info(f"No auto-generated captions available for video: {video_id}")
                return None

            # Try to find English auto-generated captions first
            selected_transcript = None
            for transcript in auto_transcripts:
                if transcript.language_code.startswith('en'):
                    selected_transcript = transcript
                    logger.info(f"✅ Found English auto-generated captions for {video_id}")
                    break

            # If no English, use first available
            if not selected_transcript:
                selected_transcript = auto_transcripts[0]
                logger.info(f"✅ Using {selected_transcript.language_code} auto-generated captions for {video_id}")

            # Fetch the caption data
            caption_data = selected_transcript.fetch()

            # Convert to phrase format
            phrases = []
            for entry in caption_data:
                phrase = {
                    'text': entry['text'],
                    'start_time': entry['start'],
                    'duration': entry['duration']
                }
                phrases.append(phrase)

            result = {
                "phrases": phrases,
                "language": selected_transcript.language_code,
                "is_auto_generated": True,
                "source": "auto_captions"
            }

            logger.info(f"✅ Retrieved {len(phrases)} auto-generated caption phrases for {video_id}")
            return result

        except TranscriptsDisabled:
            logger.warning(f"Transcripts/captions disabled for {video_id}")
            return None
        except NoTranscriptFound:
            logger.warning(f"No auto-generated captions found for {video_id}")
            return None
        except VideoUnavailable:
            logger.warning(f"Video unavailable: {video_id}")
            return None
        except Exception as e:
            logger.warning(f"Failed to get auto-generated captions for {video_id}: {str(e)}")
            logger.debug(f"Exception details: {e}", exc_info=True)
            return None

    def get_content_for_practice(self, video_id: str) -> Optional[Dict]:
        """
        MASTER FALLBACK METHOD - This is the core of the feature!

        Intelligently tries to get content for practice in priority order:
        1. Transcript (BEST quality) 📝
        2. Official captions (GOOD quality) 📺
        3. Auto-generated captions (ACCEPTABLE quality) 🤖
        4. None (suggest recommendations) ❌

        This ensures users ALMOST NEVER see "no content"!

        Returns:
            Dict with:
              - content: the actual phrases
              - source: which source was used
              - quality: quality level
              - warning: optional warning message
            None: if absolutely nothing available
        """
        logger.info(f"🎯 Starting content fallback for video: {video_id}")

        # LEVEL 1: TRY TRANSCRIPT (BEST)
        logger.info(f"📝 LEVEL 1: Attempting transcript for {video_id}")
        try:
            transcript = self.get_transcript(video_id)
            if transcript and transcript.get("phrases") and len(transcript["phrases"]) > 0:
                logger.info(f"✅ SUCCESS: Transcript found for {video_id} ({len(transcript['phrases'])} phrases)")
                return {
                    "content": transcript,
                    "source": "transcript",
                    "quality": "best",
                    "warning": None
                }
            logger.debug(f"Transcript empty or invalid for {video_id}")
        except Exception as e:
            logger.debug(f"Transcript fetch failed for {video_id}: {str(e)}")

        # LEVEL 2: TRY OFFICIAL CAPTIONS (GOOD)
        logger.info(f"📺 LEVEL 2: Attempting manual captions for {video_id}")
        try:
            captions = self.get_video_captions(video_id)
            if captions and captions.get("phrases") and len(captions["phrases"]) > 0:
                logger.info(f"✅ SUCCESS: Manual captions found for {video_id} ({len(captions['phrases'])} phrases)")
                return {
                    "content": captions,
                    "source": "captions",
                    "quality": "good",
                    "warning": None
                }
            logger.debug(f"Manual captions empty or invalid for {video_id}")
        except Exception as e:
            logger.debug(f"Manual captions fetch failed for {video_id}: {str(e)}")

        # LEVEL 3: TRY AUTO-GENERATED CAPTIONS (ACCEPTABLE)
        logger.info(f"🤖 LEVEL 3: Attempting auto-generated captions for {video_id}")
        try:
            auto_captions = self.get_auto_generated_captions(video_id)
            if auto_captions and auto_captions.get("phrases") and len(auto_captions["phrases"]) > 0:
                logger.info(f"✅ SUCCESS: Auto-generated captions found for {video_id} ({len(auto_captions['phrases'])} phrases)")
                return {
                    "content": auto_captions,
                    "source": "auto_captions",
                    "quality": "acceptable",
                    "warning": "Auto-generated - may contain errors but great for practice!"
                }
            logger.debug(f"Auto-generated captions empty or invalid for {video_id}")
        except Exception as e:
            logger.debug(f"Auto-generated captions fetch failed for {video_id}: {str(e)}")

        # LEVEL 4: NOTHING AVAILABLE
        logger.warning(f"❌ NO CONTENT: No transcript/captions available for {video_id}")
        return None
