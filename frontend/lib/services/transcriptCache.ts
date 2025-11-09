/**
 * IndexedDB Cache Service for Transcript Data
 *
 * Provides caching layer for transcripts to reduce API calls and improve performance.
 * Uses Dexie.js (wrapper around IndexedDB) for simpler database operations.
 *
 * Features:
 * - Store transcripts locally for offline access
 * - Reduce API calls with intelligent caching
 * - Instant retrieval on second visit
 * - 30-day expiration policy
 * - Cache statistics and management
 */

import Dexie, { Table } from 'dexie';

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = 'ShadowSpeakDB';
const DB_VERSION = 1;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Cached transcript entry stored in IndexedDB
 */
export interface CachedTranscript {
  videoId: string; // Primary key
  transcript: any; // TranscriptResponse from orchestrator
  timestamp: number; // When cached (milliseconds since epoch)
  expiresAt: number; // Expiration timestamp
  source: 'youtube' | 'web_speech'; // Source of transcript
  language: string; // Language code (en, es, fr, etc.)
}

/**
 * Cache statistics for a single cache hit
 */
export interface CacheStats {
  hit: boolean;
  age?: number; // milliseconds since cached
  source: 'cache' | 'fresh';
}

/**
 * Overall cache statistics
 */
export interface CacheStatistics {
  totalEntries: number;
  totalStorageBytes: number;
  oldestEntry?: {
    videoId: string;
    timestamp: number;
    age: number;
  };
  newestEntry?: {
    videoId: string;
    timestamp: number;
    age: number;
  };
  cachedVideos: Array<{
    videoId: string;
    language: string;
    source: string;
    timestamp: number;
    expiresAt: number;
    sizeBytes: number;
  }>;
}

/**
 * Cache operation result
 */
export interface CacheOperationResult {
  success: boolean;
  message: string;
  error?: Error;
}

// ============================================================================
// Database Definition
// ============================================================================

/**
 * Dexie database class for ShadowSpeak transcripts
 */
class TranscriptDatabase extends Dexie {
  transcripts!: Table<CachedTranscript, string>;

  constructor() {
    super(DB_NAME);

    // Define database schema
    this.version(DB_VERSION).stores({
      transcripts: 'videoId, timestamp, expiresAt, source, language'
    });
  }
}

// ============================================================================
// Database Instance
// ============================================================================

let db: TranscriptDatabase | null = null;

/**
 * Initialize the database
 *
 * Creates the IndexedDB database and object stores.
 * Safe to call multiple times - will return existing instance.
 *
 * @returns Database instance
 * @throws Error if IndexedDB is not supported
 */
export function initializeDatabase(): TranscriptDatabase {
  if (db) {
    return db;
  }

  // Check if IndexedDB is supported
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('IndexedDB is not supported in this environment');
  }

  try {
    db = new TranscriptDatabase();
    console.log('[TranscriptCache] Database initialized successfully');
    return db;
  } catch (error) {
    console.error('[TranscriptCache] Failed to initialize database:', error);
    throw new Error(`Failed to initialize database: ${error}`);
  }
}

/**
 * Get database instance (lazy initialization)
 */
function getDB(): TranscriptDatabase {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

// ============================================================================
// Cache Key Generation
// ============================================================================

/**
 * Generate unique cache key for video + language combination
 *
 * @param videoId - YouTube video ID
 * @param language - Language code
 * @returns Cache key string
 */
export function getCacheKey(videoId: string, language: string): string {
  return `${videoId}:${language}`;
}

// ============================================================================
// Save Transcript
// ============================================================================

/**
 * Save transcript to cache
 *
 * Stores transcript with metadata including timestamp and expiration.
 * Automatically sets 30-day expiration from current time.
 *
 * @param videoId - YouTube video ID
 * @param transcript - TranscriptResponse from orchestrator
 * @returns Promise resolving to success status
 *
 * @example
 * ```typescript
 * await saveTranscriptToCache('dQw4w9WgXcQ', transcriptResponse);
 * ```
 */
export async function saveTranscriptToCache(
  videoId: string,
  transcript: any
): Promise<CacheOperationResult> {
  try {
    const database = getDB();
    const now = Date.now();

    const cached: CachedTranscript = {
      videoId,
      transcript,
      timestamp: now,
      expiresAt: now + CACHE_TTL_MS,
      source: transcript.source || 'youtube',
      language: transcript.language || 'en'
    };

    await database.transcripts.put(cached);

    const expiryDays = (CACHE_TTL_MS / 1000 / 60 / 60 / 24).toFixed(0);
    console.log(
      `[TranscriptCache] SAVED ${videoId} (${cached.language}) - expires in ${expiryDays} days`
    );

    return {
      success: true,
      message: `Transcript cached successfully (expires in ${expiryDays} days)`
    };
  } catch (error) {
    console.error('[TranscriptCache] Failed to save transcript:', error);

    // Handle quota exceeded error
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      return {
        success: false,
        message: 'Storage quota exceeded. Please clear some cache.',
        error: error as Error
      };
    }

    return {
      success: false,
      message: 'Failed to save transcript to cache',
      error: error as Error
    };
  }
}

// ============================================================================
// Retrieve Transcript
// ============================================================================

/**
 * Retrieve transcript from cache
 *
 * Checks if transcript exists and is not expired.
 * Automatically cleans up expired entries.
 *
 * @param videoId - YouTube video ID
 * @returns Promise resolving to transcript or null if expired/missing
 *
 * @example
 * ```typescript
 * const transcript = await getTranscriptFromCache('dQw4w9WgXcQ');
 * if (transcript) {
 *   console.log('Cache hit!', transcript);
 * }
 * ```
 */
export async function getTranscriptFromCache(
  videoId: string
): Promise<any | null> {
  try {
    const database = getDB();
    const cached = await database.transcripts.get(videoId);

    if (!cached) {
      console.log(`[TranscriptCache] MISS for ${videoId}`);
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (cached.expiresAt < now) {
      const expiredMinutes = ((now - cached.expiresAt) / 1000 / 60).toFixed(1);
      console.log(
        `[TranscriptCache] EXPIRED for ${videoId} (expired ${expiredMinutes} minutes ago)`
      );

      // Clean up expired entry
      await database.transcripts.delete(videoId);
      return null;
    }

    // Valid cache hit
    const age = now - cached.timestamp;
    const ageMinutes = (age / 1000 / 60).toFixed(1);
    console.log(`[TranscriptCache] HIT for ${videoId} (age: ${ageMinutes} minutes)`);

    return cached.transcript;
  } catch (error) {
    console.error('[TranscriptCache] Failed to retrieve transcript:', error);
    return null; // Gracefully fail - don't block the app
  }
}

/**
 * Get cached transcript with detailed stats (for orchestrator compatibility)
 *
 * @param videoId - YouTube video ID
 * @param language - Language code
 * @returns Promise resolving to transcript data with cache stats or null
 */
export async function getCachedTranscript(
  videoId: string,
  language: string
): Promise<{ data: any; stats: CacheStats } | null> {
  try {
    const database = getDB();
    const cached = await database.transcripts.get(videoId);

    if (!cached) {
      console.log(`[TranscriptCache] MISS for ${videoId}:${language}`);
      return null;
    }

    // Check if language matches
    if (cached.language !== language) {
      console.log(
        `[TranscriptCache] Language mismatch for ${videoId} (cached: ${cached.language}, requested: ${language})`
      );
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (cached.expiresAt < now) {
      const expiredMinutes = ((now - cached.expiresAt) / 1000 / 60).toFixed(1);
      console.log(
        `[TranscriptCache] EXPIRED for ${videoId}:${language} (expired ${expiredMinutes} minutes ago)`
      );

      // Clean up expired entry
      await database.transcripts.delete(videoId);
      return null;
    }

    // Valid cache hit
    const age = now - cached.timestamp;
    const ageMinutes = (age / 1000 / 60).toFixed(1);
    console.log(
      `[TranscriptCache] HIT for ${videoId}:${language} (age: ${ageMinutes} minutes)`
    );

    return {
      data: cached.transcript,
      stats: {
        hit: true,
        age,
        source: 'cache'
      }
    };
  } catch (error) {
    console.error('[TranscriptCache] Failed to retrieve transcript:', error);
    return null; // Gracefully fail - don't block the app
  }
}

// ============================================================================
// Clear Cache
// ============================================================================

/**
 * Clear transcript cache
 *
 * If videoId is provided, clears cache for that specific video.
 * If videoId is not provided, clears all cache entries.
 *
 * @param videoId - Optional video ID to clear
 * @returns Promise resolving to number of cleared items
 *
 * @example
 * ```typescript
 * // Clear specific video
 * const count = await clearTranscriptCache('dQw4w9WgXcQ');
 *
 * // Clear all cache
 * const totalCount = await clearTranscriptCache();
 * ```
 */
export async function clearTranscriptCache(videoId?: string): Promise<number> {
  try {
    const database = getDB();

    if (videoId) {
      // Clear specific video
      const cached = await database.transcripts.get(videoId);
      if (cached) {
        await database.transcripts.delete(videoId);
        console.log(`[TranscriptCache] CLEARED cache for video ${videoId}`);
        return 1;
      }
      console.log(`[TranscriptCache] No cache found for video ${videoId}`);
      return 0;
    } else {
      // Clear all cache
      const count = await database.transcripts.count();
      await database.transcripts.clear();
      console.log(`[TranscriptCache] CLEARED all cache (${count} entries)`);
      return count;
    }
  } catch (error) {
    console.error('[TranscriptCache] Failed to clear cache:', error);
    return 0;
  }
}

/**
 * Delete cached transcript (alias for compatibility)
 */
export async function deleteCachedTranscript(
  videoId: string,
  language: string
): Promise<void> {
  await clearTranscriptCache(videoId);
}

/**
 * Clear all cached transcripts for a video (all languages)
 */
export async function clearVideoCache(videoId: string): Promise<void> {
  await clearTranscriptCache(videoId);
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  await clearTranscriptCache();
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Get cache statistics
 *
 * Returns detailed information about cached transcripts including:
 * - Total number of cached items
 * - Total storage used (approximate)
 * - Oldest and newest entries
 * - List of all cached videos with metadata
 *
 * @returns Promise resolving to cache statistics
 *
 * @example
 * ```typescript
 * const stats = await getCacheStats();
 * console.log(`Cached: ${stats.totalEntries} videos`);
 * console.log(`Storage: ${(stats.totalStorageBytes / 1024).toFixed(2)} KB`);
 * ```
 */
export async function getCacheStats(): Promise<CacheStatistics> {
  try {
    const database = getDB();
    const allTranscripts = await database.transcripts.toArray();
    const now = Date.now();

    let totalStorageBytes = 0;
    let oldestEntry: CacheStatistics['oldestEntry'];
    let newestEntry: CacheStatistics['newestEntry'];
    const cachedVideos: CacheStatistics['cachedVideos'] = [];

    for (const cached of allTranscripts) {
      // Calculate size (approximate)
      const sizeBytes = JSON.stringify(cached.transcript).length;
      totalStorageBytes += sizeBytes;

      // Track oldest entry
      if (!oldestEntry || cached.timestamp < oldestEntry.timestamp) {
        oldestEntry = {
          videoId: cached.videoId,
          timestamp: cached.timestamp,
          age: now - cached.timestamp
        };
      }

      // Track newest entry
      if (!newestEntry || cached.timestamp > newestEntry.timestamp) {
        newestEntry = {
          videoId: cached.videoId,
          timestamp: cached.timestamp,
          age: now - cached.timestamp
        };
      }

      // Add to cached videos list
      cachedVideos.push({
        videoId: cached.videoId,
        language: cached.language,
        source: cached.source,
        timestamp: cached.timestamp,
        expiresAt: cached.expiresAt,
        sizeBytes
      });
    }

    return {
      totalEntries: allTranscripts.length,
      totalStorageBytes,
      oldestEntry,
      newestEntry,
      cachedVideos
    };
  } catch (error) {
    console.error('[TranscriptCache] Failed to get cache statistics:', error);
    return {
      totalEntries: 0,
      totalStorageBytes: 0,
      cachedVideos: []
    };
  }
}

/**
 * Get cache statistics (alias for compatibility)
 */
export async function getCacheStatistics(): Promise<{
  totalEntries: number;
  totalSize: number;
  oldestEntry?: number;
  newestEntry?: number;
}> {
  const stats = await getCacheStats();
  return {
    totalEntries: stats.totalEntries,
    totalSize: stats.totalStorageBytes,
    oldestEntry: stats.oldestEntry?.timestamp,
    newestEntry: stats.newestEntry?.timestamp
  };
}

/**
 * Clear all expired cache entries
 *
 * Removes transcripts that have exceeded their 30-day TTL.
 * This is automatically called when retrieving cached transcripts,
 * but can be manually triggered for cleanup.
 *
 * @returns Promise resolving to number of expired entries removed
 *
 * @example
 * ```typescript
 * const removed = await clearExpiredCache();
 * console.log(`Removed ${removed} expired entries`);
 * ```
 */
export async function clearExpiredCache(): Promise<number> {
  try {
    const database = getDB();
    const now = Date.now();

    // Find all expired entries
    const expired = await database.transcripts
      .where('expiresAt')
      .below(now)
      .toArray();

    // Delete expired entries
    const expiredIds = expired.map(e => e.videoId);
    await database.transcripts.bulkDelete(expiredIds);

    console.log(`[TranscriptCache] CLEARED ${expired.length} expired entries`);
    return expired.length;
  } catch (error) {
    console.error('[TranscriptCache] Failed to clear expired cache:', error);
    return 0;
  }
}

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Check if a transcript is cached (without retrieving it)
 *
 * @param videoId - YouTube video ID
 * @returns Promise resolving to true if cached and valid, false otherwise
 */
export async function isTranscriptCached(videoId: string): Promise<boolean> {
  try {
    const database = getDB();
    const cached = await database.transcripts.get(videoId);

    if (!cached) {
      return false;
    }

    // Check if expired
    const now = Date.now();
    if (cached.expiresAt < now) {
      // Clean up expired entry
      await database.transcripts.delete(videoId);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[TranscriptCache] Failed to check cache:', error);
    return false;
  }
}

/**
 * Set cached transcript (alias for compatibility with orchestrator)
 */
export async function setCachedTranscript(
  videoId: string,
  language: string,
  data: any
): Promise<void> {
  const dataWithLanguage = {
    ...data,
    language: language || data.language || 'en'
  };
  await saveTranscriptToCache(videoId, dataWithLanguage);
}

/**
 * Get cache TTL in milliseconds
 */
export function getCacheTTL(): number {
  return CACHE_TTL_MS;
}

/**
 * Get cache TTL in days
 */
export function getCacheTTLDays(): number {
  return CACHE_TTL_MS / (1000 * 60 * 60 * 24);
}

/**
 * Format cache age for display
 *
 * @param ageMs - Age in milliseconds
 * @returns Human-readable age string
 */
export function formatCacheAge(ageMs: number): string {
  const minutes = ageMs / 1000 / 60;
  const hours = minutes / 60;
  const days = hours / 24;

  if (days >= 1) {
    return `${days.toFixed(1)} days`;
  } else if (hours >= 1) {
    return `${hours.toFixed(1)} hours`;
  } else {
    return `${minutes.toFixed(1)} minutes`;
  }
}

// ============================================================================
// Error Handling & Database Health
// ============================================================================

/**
 * Check if database is healthy and accessible
 *
 * @returns Promise resolving to true if database is working, false otherwise
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const database = getDB();
    await database.transcripts.count();
    return true;
  } catch (error) {
    console.error('[TranscriptCache] Database health check failed:', error);
    return false;
  }
}

/**
 * Repair database by clearing corrupted data
 *
 * Use this as a last resort if database operations are failing.
 *
 * @returns Promise resolving to repair result
 */
export async function repairDatabase(): Promise<CacheOperationResult> {
  try {
    console.log('[TranscriptCache] Starting database repair...');

    // Close existing connection
    if (db) {
      db.close();
      db = null;
    }

    // Delete the database
    await Dexie.delete(DB_NAME);
    console.log('[TranscriptCache] Database deleted');

    // Reinitialize
    initializeDatabase();
    console.log('[TranscriptCache] Database reinitialized');

    return {
      success: true,
      message: 'Database repaired successfully'
    };
  } catch (error) {
    console.error('[TranscriptCache] Database repair failed:', error);
    return {
      success: false,
      message: 'Failed to repair database',
      error: error as Error
    };
  }
}

// ============================================================================
// Export Database Instance (for debugging)
// ============================================================================

/**
 * Get raw database instance for advanced operations
 * USE WITH CAUTION - for debugging only
 */
export function getRawDatabase(): TranscriptDatabase | null {
  return db;
}
