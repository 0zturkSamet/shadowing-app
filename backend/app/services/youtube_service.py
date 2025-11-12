"""
YouTube data service.

Provides helper methods for searching videos, fetching metadata,
and extracting transcript content that can be used for practice.
The service attempts to use the real YouTube Data API when possible
and falls back to a set of deterministic offline fixtures so tests
can run without external connectivity.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import isodate

logger = logging.getLogger(__name__)


try:  # Lazy import so tests do not fail if the client is unavailable.
    from googleapiclient.discovery import build
except Exception:  # pragma: no cover - best effort import guard
    build = None  # type: ignore[assignment]

try:
    from youtube_transcript_api import (  # type: ignore[import]
        YouTubeTranscriptApi,
        TranscriptsDisabled,
        NoTranscriptFound,
        CouldNotRetrieveTranscript,
    )
except Exception:  # pragma: no cover - best effort import guard
    YouTubeTranscriptApi = None  # type: ignore[assignment]
    TranscriptsDisabled = NoTranscriptFound = CouldNotRetrieveTranscript = Exception


SampleTranscript = List[Dict[str, Any]]


@dataclass
class SampleVideo:
    """Dataclass representing built-in fallback video fixtures."""

    youtube_id: str
    title: str
    description: str
    language: str
    duration: int
    channel_name: str
    thumbnail_url: str
    view_count: int
    transcript: SampleTranscript = field(default_factory=list)


SAMPLE_VIDEOS: List[SampleVideo] = [
    SampleVideo(
        youtube_id="test_spanish_1",
        title="Spanish Basics: Greetings",
        description="Practice essential Spanish greetings with call-and-response.",
        language="es",
        duration=310,
        channel_name="LinguaLab",
        thumbnail_url="https://img.youtube.com/vi/test_spanish_1/hqdefault.jpg",
        view_count=12800,
        transcript=[
            {"text": "Hola y bienvenidos a la clase de hoy.", "start": 0.0, "duration": 3.2},
            {"text": "Repite conmigo: Hola, ¿cómo estás?", "start": 3.5, "duration": 2.8},
            {"text": "Muy bien, gracias. ¿Y tú?", "start": 6.8, "duration": 2.4},
        ],
    ),
    SampleVideo(
        youtube_id="test_french_1",
        title="French Listening Practice",
        description="Shadow common French travel phrases with native pronunciation.",
        language="fr",
        duration=285,
        channel_name="Polyglot Studio",
        thumbnail_url="https://img.youtube.com/vi/test_french_1/hqdefault.jpg",
        view_count=8300,
        transcript=[
            {"text": "Bonjour et merci d'être ici.", "start": 0.0, "duration": 2.6},
            {"text": "Répétez: Où est la gare, s'il vous plaît ?", "start": 2.9, "duration": 3.0},
            {"text": "La gare est près du musée.", "start": 6.2, "duration": 2.5},
        ],
    ),
    SampleVideo(
        youtube_id="test_german_1",
        title="German Essentials: Ordering Food",
        description="Shadow German restaurant phrases for beginners.",
        language="de",
        duration=360,
        channel_name="Cafe Deutsch",
        thumbnail_url="https://img.youtube.com/vi/test_german_1/hqdefault.jpg",
        view_count=9400,
        transcript=[
            {"text": "Willkommen in unserem Sprachcafé.", "start": 0.0, "duration": 3.0},
            {"text": "Ich hätte gern einen Kaffee, bitte.", "start": 3.3, "duration": 2.7},
            {"text": "Möchten Sie sonst noch etwas?", "start": 6.5, "duration": 2.2},
        ],
    ),
]


class YouTubeService:
    """
    Lightweight wrapper around the YouTube Data API.

    The service gracefully falls back to offline fixtures whenever the API
    client cannot be initialised (e.g., missing network access).
    """

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self.youtube = None

        if api_key and build:
            try:
                self.youtube = build(
                    "youtube",
                    "v3",
                    developerKey=api_key,
                    cache_discovery=False,
                )
                logger.info("YouTube client initialised successfully")
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Failed to initialise YouTube client: %s", exc)
                self.youtube = None
        else:
            logger.warning("YouTube client not initialised (missing API key or googleapiclient)")

    # --------------------------------------------------------------------- #
    # Public API
    # --------------------------------------------------------------------- #
    def search_videos(self, query: str, language: str, max_results: int) -> List[Dict[str, Any]]:
        """
        Search for videos matching the supplied query.

        Falls back to predefined fixtures when the external API call fails.
        """
        if self.youtube:
            try:
                return self._search_remote(query, language, max_results)
            except Exception as exc:
                logger.warning("Falling back to sample search results: %s", exc)

        return self._search_local(query, language, max_results)

    def get_video_metadata(self, video_id: str) -> Dict[str, Any]:
        """
        Fetch metadata for a single video.

        Args:
            video_id: YouTube video identifier
        """
        if self.youtube:
            try:
                return self._get_remote_metadata(video_id)
            except Exception as exc:
                logger.warning("Falling back to sample metadata for %s: %s", video_id, exc)

        sample = self._get_sample_video(video_id)
        if not sample:
            raise ValueError(f"Video not found: {video_id}")

        return self._sample_to_metadata(sample)

    def get_content_for_practice(self, video_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve transcript/captions for a video and convert them into
        phrase segments suitable for practice.
        """
        transcript_entries: Optional[SampleTranscript] = None
        language = "unknown"
        source = "transcript"
        quality = "best"

        if YouTubeTranscriptApi:
            try:
                transcript_entries = YouTubeTranscriptApi.get_transcript(video_id)
            except (TranscriptsDisabled, NoTranscriptFound, CouldNotRetrieveTranscript):
                logger.info("Transcript unavailable for %s, attempting auto-generated captions", video_id)
                try:
                    transcript_entries = YouTubeTranscriptApi.get_transcript(video_id, languages=["en"])
                    source = "auto_captions"
                    quality = "acceptable"
                except Exception as exc:
                    logger.warning("Failed to fetch transcript for %s: %s", video_id, exc)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Unexpected transcript error for %s: %s", video_id, exc)

        if not transcript_entries:
            sample = self._get_sample_video(video_id)
            if not sample or not sample.transcript:
                return None
            transcript_entries = sample.transcript
            language = sample.language
            source = "sample_transcript"
            quality = "good"

        phrases = self._build_phrases(transcript_entries, language)
        if not phrases:
            return None

        return {
            "source": source,
            "quality": quality,
            "language": language,
            "content": {
                "phrases": phrases
            }
        }

    # --------------------------------------------------------------------- #
    # Remote helpers
    # --------------------------------------------------------------------- #
    def _search_remote(self, query: str, language: str, max_results: int) -> List[Dict[str, Any]]:
        search_request = self.youtube.search().list(  # type: ignore[union-attr]
            part="id,snippet",
            q=query,
            type="video",
            maxResults=max_results,
            relevanceLanguage=language or None,
        )
        search_response = search_request.execute()

        video_ids = [
            item["id"]["videoId"]
            for item in search_response.get("items", [])
            if item.get("id", {}).get("videoId")
        ]

        if not video_ids:
            return []

        details_request = self.youtube.videos().list(  # type: ignore[union-attr]
            part="snippet,contentDetails,statistics",
            id=",".join(video_ids),
        )
        details_response = details_request.execute()
        details_map = {
            item["id"]: item
            for item in details_response.get("items", [])
        }

        results: List[Dict[str, Any]] = []
        for vid in video_ids:
            detail = details_map.get(vid)
            if detail:
                results.append(self._format_remote_video(detail, language))
        return results

    def _get_remote_metadata(self, video_id: str) -> Dict[str, Any]:
        details_request = self.youtube.videos().list(  # type: ignore[union-attr]
            part="snippet,contentDetails,statistics",
            id=video_id,
            maxResults=1,
        )
        response = details_request.execute()
        items = response.get("items", [])
        if not items:
            raise ValueError(f"Video not found: {video_id}")
        return self._format_remote_video(items[0], default_language="unknown")

    # --------------------------------------------------------------------- #
    # Local/sample helpers
    # --------------------------------------------------------------------- #
    def _search_local(self, query: str, language: str, max_results: int) -> List[Dict[str, Any]]:
        normalized_query = query.lower()
        normalized_lang = language.lower()

        results: List[Dict[str, Any]] = []
        for sample in SAMPLE_VIDEOS:
            if normalized_lang and sample.language.lower() != normalized_lang:
                continue
            if normalized_query not in sample.title.lower() and normalized_query not in sample.description.lower():
                continue
            results.append(self._sample_to_metadata(sample))
            if len(results) >= max_results:
                break
        return results

    @staticmethod
    def _sample_to_metadata(sample: SampleVideo) -> Dict[str, Any]:
        return {
            "youtube_id": sample.youtube_id,
            "title": sample.title,
            "description": sample.description,
            "language": sample.language,
            "duration": sample.duration,
            "channel_name": sample.channel_name,
            "thumbnail_url": sample.thumbnail_url,
            "view_count": sample.view_count,
        }

    @staticmethod
    def _build_phrases(transcript: SampleTranscript, language: str) -> List[Dict[str, Any]]:
        phrases: List[Dict[str, Any]] = []
        for idx, entry in enumerate(transcript):
            text = entry.get("text", "").strip()
            if not text:
                continue
            phrases.append(
                {
                    "index": idx,
                    "text": text,
                    "start_time": float(round(entry.get("start", 0.0), 3)),
                    "duration": float(round(entry.get("duration", 0.0), 3)),
                    "language": language,
                }
            )
        return phrases

    @staticmethod
    def _get_sample_video(video_id: str) -> Optional[SampleVideo]:
        for sample in SAMPLE_VIDEOS:
            if sample.youtube_id == video_id:
                return sample
        return None

    # --------------------------------------------------------------------- #
    # Formatting helpers
    # --------------------------------------------------------------------- #
    @staticmethod
    def _format_remote_video(item: Dict[str, Any], default_language: str) -> Dict[str, Any]:
        snippet = item.get("snippet", {})
        content_details = item.get("contentDetails", {})
        statistics = item.get("statistics", {})

        duration_str = content_details.get("duration", "PT0S")
        duration_seconds = YouTubeService._duration_to_seconds(duration_str)

        return {
            "youtube_id": item.get("id"),
            "title": snippet.get("title", "Untitled"),
            "description": snippet.get("description", ""),
            "language": snippet.get("defaultAudioLanguage")
            or snippet.get("defaultLanguage")
            or default_language,
            "duration": duration_seconds,
            "channel_name": snippet.get("channelTitle", "Unknown Channel"),
            "thumbnail_url": (snippet.get("thumbnails", {}).get("high") or snippet.get("thumbnails", {}).get("default", {})).get("url", ""),
            "view_count": int(statistics.get("viewCount", 0)),
        }

    @staticmethod
    def _duration_to_seconds(duration: str) -> int:
        try:
            parsed = isodate.parse_duration(duration)
            return int(parsed.total_seconds())
        except (isodate.ISO8601Error, AttributeError, TypeError):
            return 0
