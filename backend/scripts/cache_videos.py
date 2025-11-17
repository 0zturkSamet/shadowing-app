#!/usr/bin/env python3
"""
Pre-cache videos for production deployment.

This script pre-caches video transcripts in Redis to ensure instant loading
for demo videos. Run this before deployment to warm up the cache.

Usage:
    python scripts/cache_videos.py
"""
import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path so we can import from app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services import whisper_service
from app.services.cache import cache_service
from app.config import settings


# Videos to pre-cache
DEMO_VIDEOS = [
    {
        "url": "https://www.youtube.com/watch?v=mkrw9J064H8",
        "video_id": "mkrw9J064H8",
        "language": "en",
        "description": "Demo Video 1"
    },
    {
        "url": "https://www.youtube.com/watch?v=TUVcZfQe-Kw",
        "video_id": "TUVcZfQe-Kw",
        "language": "en",
        "description": "Demo Video 2"
    }
]


async def cache_single_video(video_info: dict) -> bool:
    """
    Cache a single video transcript.

    Args:
        video_info: Dictionary with url, video_id, language, description

    Returns:
        bool: True if successful, False otherwise
    """
    print(f"\n{'='*60}")
    print(f"Caching: {video_info['description']}")
    print(f"Video ID: {video_info['video_id']}")
    print(f"URL: {video_info['url']}")
    print(f"{'='*60}")

    try:
        # Check if already cached
        cached = await whisper_service.get_cached_transcript(video_info['video_id'])
        if cached:
            print(f"✅ Already cached! Skipping...")
            return True

        # Transcribe and cache
        print(f"🎙️  Transcribing with Whisper API...")
        result = await whisper_service.transcribe_youtube_video(
            youtube_url=video_info['url'],
            use_cache=True,
            language=video_info.get('language')
        )

        if result.get('status') == 'success':
            transcript_count = len(result.get('transcript', []))
            processing_time = result.get('processing_time', 0)
            print(f"✅ Success!")
            print(f"   - Sentences: {transcript_count}")
            print(f"   - Processing time: {processing_time}s")
            print(f"   - Language: {result.get('language', 'unknown')}")
            return True
        else:
            print(f"❌ Failed: {result.get('message', 'Unknown error')}")
            return False

    except Exception as e:
        print(f"❌ Error caching video {video_info['video_id']}: {e}")
        return False


async def main():
    """Main function to cache all demo videos."""
    print("\n" + "="*60)
    print("VIDEO CACHE WARMUP SCRIPT")
    print("="*60)
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Redis URL: {settings.REDIS_URL}")
    print(f"Videos to cache: {len(DEMO_VIDEOS)}")
    print("="*60 + "\n")

    # Check Redis connection
    if not cache_service.health_check():
        print("❌ Redis is not available. Please start Redis and try again.")
        print("   Run: redis-server")
        sys.exit(1)

    print("✅ Redis connection healthy\n")

    # Cache each video
    results = []
    for i, video in enumerate(DEMO_VIDEOS, 1):
        print(f"\nProgress: {i}/{len(DEMO_VIDEOS)}")
        success = await cache_single_video(video)
        results.append(success)

        # Brief pause between requests to avoid rate limiting
        if i < len(DEMO_VIDEOS):
            await asyncio.sleep(2)

    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    successful = sum(results)
    failed = len(results) - successful
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    print(f"📊 Total: {len(results)}")
    print("="*60 + "\n")

    if failed > 0:
        print("⚠️  Some videos failed to cache. Check the logs above.")
        sys.exit(1)
    else:
        print("🎉 All videos cached successfully!")
        print("Your app is ready for deployment!\n")
        sys.exit(0)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user. Exiting...")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        sys.exit(1)
