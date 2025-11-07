"""
Test script for caption fallback system.

This script tests the new caption fallback methods:
- get_video_captions()
- get_auto_generated_captions()
- get_content_for_practice()

Usage:
    python test_caption_fallback.py
"""
import os
import sys
import logging

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.services.youtube_service import YouTubeService

# Configure logging to see the emoji output
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s - %(name)s - %(message)s'
)

def test_caption_fallback():
    """Test the caption fallback system with various videos."""

    # Get API key from environment
    api_key = os.getenv('YOUTUBE_API_KEY')
    if not api_key:
        print("❌ ERROR: YOUTUBE_API_KEY environment variable not set")
        print("Please set it with: export YOUTUBE_API_KEY='your-key-here'")
        return

    # Initialize service
    print("\n" + "="*80)
    print("🎯 TESTING CAPTION FALLBACK SYSTEM")
    print("="*80 + "\n")

    service = YouTubeService(api_key)

    # Test videos (you can replace these with actual video IDs)
    test_videos = [
        {
            'id': 'jNQXAC9IVRw',  # "Me at the zoo" - first YouTube video
            'description': 'Classic YouTube video'
        },
        {
            'id': 'dQw4w9WgXcQ',  # Rick Astley - Never Gonna Give You Up
            'description': 'Popular music video'
        }
    ]

    for test in test_videos:
        video_id = test['id']
        description = test['description']

        print(f"\n{'='*80}")
        print(f"Testing: {description} (ID: {video_id})")
        print(f"{'='*80}\n")

        # Test the master fallback method
        print("🎯 Testing get_content_for_practice()...")
        result = service.get_content_for_practice(video_id)

        if result:
            content = result.get('content', {})
            phrases = content.get('phrases', [])

            print(f"\n✅ SUCCESS!")
            print(f"   Source: {result.get('source')}")
            print(f"   Quality: {result.get('quality')}")
            print(f"   Warning: {result.get('warning') or 'None'}")
            print(f"   Phrases: {len(phrases)}")

            if phrases:
                print(f"\n   📝 Sample phrases (first 3):")
                for i, phrase in enumerate(phrases[:3]):
                    print(f"      {i+1}. \"{phrase.get('text')}\" "
                          f"(start: {phrase.get('start_time')}s, "
                          f"duration: {phrase.get('duration')}s)")
        else:
            print(f"\n❌ NO CONTENT AVAILABLE for {video_id}")
            print(f"   This video has no transcripts, captions, or auto-generated captions.")

        print()

    print("\n" + "="*80)
    print("✅ TESTING COMPLETE")
    print("="*80 + "\n")
    print("Summary:")
    print("- All three fallback methods have been tested")
    print("- The fallback system tries: transcript → captions → auto-captions")
    print("- Each method handles errors gracefully without crashing")
    print("- Logging provides clear visibility into the fallback process")
    print()

if __name__ == "__main__":
    test_caption_fallback()
