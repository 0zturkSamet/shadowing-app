/**
 * Seed Cache Utility
 *
 * Pre-seeds the frontend IndexedDB cache with demo video transcripts
 * for instant loading on first visit.
 */

import { saveTranscriptToCache } from './transcriptCache';

/**
 * Demo videos to pre-cache
 */
const DEMO_VIDEOS = [
  {
    videoId: 'mkrw9J064H8',
    url: 'https://www.youtube.com/watch?v=mkrw9J064H8',
    description: 'Demo Video 1'
  },
  {
    videoId: 'TUVcZfQe-Kw',
    url: 'https://www.youtube.com/watch?v=TUVcZfQe-Kw',
    description: 'Demo Video 2'
  }
];

/**
 * Seed the cache with demo video transcripts
 *
 * Fetches transcripts from backend and stores them in IndexedDB.
 * This should be called once during app initialization or first load.
 *
 * @param apiBaseUrl - Base URL of the backend API
 * @returns Promise resolving to seeding results
 */
export async function seedDemoVideosCache(
  apiBaseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
): Promise<{
  total: number;
  successful: number;
  failed: number;
  videos: Array<{
    videoId: string;
    status: 'success' | 'failed' | 'skipped';
    message: string;
  }>;
}> {
  console.log('[SeedCache] Starting demo video cache seeding...');

  const results = {
    total: DEMO_VIDEOS.length,
    successful: 0,
    failed: 0,
    videos: [] as Array<{
      videoId: string;
      status: 'success' | 'failed' | 'skipped';
      message: string;
    }>
  };

  for (const video of DEMO_VIDEOS) {
    try {
      console.log(`[SeedCache] Fetching transcript for ${video.videoId}...`);

      // Fetch transcript from Whisper API
      const response = await fetch(`${apiBaseUrl}/api/videos/transcripts/whisper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In production, you'll need authentication
          // 'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          youtube_url: video.url,
          language: 'en',
          force_refresh: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const transcriptData = await response.json();

      // Save to IndexedDB cache
      await saveTranscriptToCache(video.videoId, transcriptData);

      console.log(`[SeedCache] ✅ Cached ${video.videoId}`);
      results.successful++;
      results.videos.push({
        videoId: video.videoId,
        status: 'success',
        message: `Cached ${transcriptData.totalSentences} sentences`
      });

    } catch (error) {
      console.error(`[SeedCache] ❌ Failed to cache ${video.videoId}:`, error);
      results.failed++;
      results.videos.push({
        videoId: video.videoId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  console.log(
    `[SeedCache] Seeding complete: ${results.successful}/${results.total} successful, ` +
    `${results.failed} failed`
  );

  return results;
}

/**
 * Check if demo videos are already cached
 *
 * @returns Promise resolving to true if all demo videos are cached
 */
export async function areDemoVideosCached(): Promise<boolean> {
  try {
    const { isTranscriptCached } = await import('./transcriptCache');

    for (const video of DEMO_VIDEOS) {
      const isCached = await isTranscriptCached(video.videoId);
      if (!isCached) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('[SeedCache] Error checking cache status:', error);
    return false;
  }
}

/**
 * Initialize demo cache if needed
 *
 * Checks if demo videos are cached, and seeds them if not.
 * Safe to call multiple times - will skip if already cached.
 *
 * @param apiBaseUrl - Base URL of the backend API
 * @returns Promise resolving to seeding results or null if already cached
 */
export async function initializeDemoCache(
  apiBaseUrl?: string
): Promise<Awaited<ReturnType<typeof seedDemoVideosCache>> | null> {
  try {
    const alreadyCached = await areDemoVideosCached();

    if (alreadyCached) {
      console.log('[SeedCache] Demo videos already cached, skipping seed');
      return null;
    }

    console.log('[SeedCache] Demo videos not cached, initializing...');
    return await seedDemoVideosCache(apiBaseUrl);
  } catch (error) {
    console.error('[SeedCache] Error initializing demo cache:', error);
    return null;
  }
}
