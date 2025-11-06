"""
YouTube API service for video search and transcript retrieval.

This module provides integration with YouTube Data API v3 and
YouTube Transcript API for searching videos and fetching transcripts.
"""
import logging
from typing import List, Dict, Optional, Any
import isodate

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
            # Search for videos
            search_response = self.youtube.search().list(
                q=query,
                part='id,snippet',
                type='video',
                relevanceLanguage=language,
                maxResults=max_results,
                videoCaption='closedCaption'  # Only videos with captions
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
            error_msg = f"Transcripts are disabled for video: {video_id}"
            logger.warning(error_msg)
            raise Exception(error_msg)
        except NoTranscriptFound:
            error_msg = f"No transcript found for video: {video_id}"
            logger.warning(error_msg)
            raise Exception(error_msg)
        except VideoUnavailable:
            error_msg = f"Video unavailable: {video_id}"
            logger.warning(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            logger.error(f"Error fetching transcript for {video_id}: {e}")
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
