/**
 * IndexedDB Cache Utility for Transcript Data
 *
 * Provides caching layer for transcripts to reduce API calls and improve performance.
 * Uses IndexedDB for client-side persistent storage.
 */

const DB_NAME = 'ShadowSpeakDB';
const DB_VERSION = 1;
const STORE_NAME = 'transcripts';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Cached transcript entry
 */
export interface CachedTranscript {
  key: string; // transcript:${videoId}:${language}
  videoId: string;
  language: string;
  data: any; // The transcript response data
  timestamp: number;
  expiresAt: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hit: boolean;
  age?: number; // milliseconds
  source: 'cache' | 'fresh';
}

/**
 * Initialize IndexedDB
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[Cache] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });

        // Create indexes for efficient querying
        objectStore.createIndex('videoId', 'videoId', { unique: false });
        objectStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });

        console.log('[Cache] Created transcript cache store');
      }
    };
  });
}

/**
 * Generate cache key
 */
export function getCacheKey(videoId: string, language: string): string {
  return `transcript:${videoId}:${language}`;
}

/**
 * Get cached transcript
 */
export async function getCachedTranscript(
  videoId: string,
  language: string
): Promise<{ data: any; stats: CacheStats } | null> {
  try {
    const db = await openDatabase();
    const key = getCacheKey(videoId, language);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const cached = request.result as CachedTranscript | undefined;

        if (!cached) {
          console.log(`[Cache] MISS for ${key}`);
          resolve(null);
          return;
        }

        // Check if expired
        const now = Date.now();
        if (cached.expiresAt < now) {
          console.log(`[Cache] EXPIRED for ${key} (expired ${((now - cached.expiresAt) / 1000 / 60).toFixed(1)} minutes ago)`);

          // Clean up expired entry
          deleteCachedTranscript(videoId, language).catch(console.error);

          resolve(null);
          return;
        }

        const age = now - cached.timestamp;
        console.log(`[Cache] HIT for ${key} (age: ${(age / 1000 / 60).toFixed(1)} minutes)`);

        resolve({
          data: cached.data,
          stats: {
            hit: true,
            age,
            source: 'cache'
          }
        });
      };

      request.onerror = () => {
        console.error('[Cache] Error reading from cache:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[Cache] Failed to get cached transcript:', error);
    return null; // Gracefully fail - don't block the app
  }
}

/**
 * Save transcript to cache
 */
export async function setCachedTranscript(
  videoId: string,
  language: string,
  data: any
): Promise<void> {
  try {
    const db = await openDatabase();
    const key = getCacheKey(videoId, language);
    const now = Date.now();

    const cached: CachedTranscript = {
      key,
      videoId,
      language,
      data,
      timestamp: now,
      expiresAt: now + CACHE_TTL_MS
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(cached);

      request.onsuccess = () => {
        console.log(`[Cache] SAVED ${key} (expires in ${CACHE_TTL_MS / 1000 / 60 / 60 / 24} days)`);
        resolve();
      };

      request.onerror = () => {
        console.error('[Cache] Error saving to cache:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[Cache] Failed to save transcript:', error);
    // Don't throw - caching is not critical
  }
}

/**
 * Delete cached transcript
 */
export async function deleteCachedTranscript(
  videoId: string,
  language: string
): Promise<void> {
  try {
    const db = await openDatabase();
    const key = getCacheKey(videoId, language);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        console.log(`[Cache] DELETED ${key}`);
        resolve();
      };

      request.onerror = () => {
        console.error('[Cache] Error deleting from cache:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[Cache] Failed to delete transcript:', error);
  }
}

/**
 * Clear all cached transcripts for a video (all languages)
 */
export async function clearVideoCache(videoId: string): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('videoId');
      const request = index.openCursor(IDBKeyRange.only(videoId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      request.onerror = () => {
        console.error('[Cache] Error clearing video cache:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        console.log(`[Cache] CLEARED all cache entries for video ${videoId}`);
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.error('[Cache] Failed to clear video cache:', error);
  }
}

/**
 * Clear all expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
  try {
    const db = await openDatabase();
    const now = Date.now();
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('expiresAt');
      const request = index.openCursor(IDBKeyRange.upperBound(now));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      request.onerror = () => {
        console.error('[Cache] Error clearing expired cache:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        console.log(`[Cache] CLEARED ${deletedCount} expired entries`);
        db.close();
        resolve(deletedCount);
      };
    });
  } catch (error) {
    console.error('[Cache] Failed to clear expired cache:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStatistics(): Promise<{
  totalEntries: number;
  totalSize: number;
  oldestEntry?: number;
  newestEntry?: number;
}> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();

      let totalSize = 0;
      let oldestEntry: number | undefined;
      let newestEntry: number | undefined;

      countRequest.onsuccess = () => {
        const totalEntries = countRequest.result;

        // Get all entries to calculate size and age
        const getAllRequest = store.openCursor();

        getAllRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const entry = cursor.value as CachedTranscript;

            // Estimate size (rough approximation)
            totalSize += JSON.stringify(entry.data).length;

            // Track timestamps
            if (!oldestEntry || entry.timestamp < oldestEntry) {
              oldestEntry = entry.timestamp;
            }
            if (!newestEntry || entry.timestamp > newestEntry) {
              newestEntry = entry.timestamp;
            }

            cursor.continue();
          } else {
            // All entries processed
            resolve({
              totalEntries,
              totalSize,
              oldestEntry,
              newestEntry
            });
          }
        };

        getAllRequest.onerror = () => {
          reject(getAllRequest.error);
        };
      };

      countRequest.onerror = () => {
        reject(countRequest.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[Cache] Failed to get cache statistics:', error);
    return {
      totalEntries: 0,
      totalSize: 0
    };
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[Cache] CLEARED all cache entries');
        resolve();
      };

      request.onerror = () => {
        console.error('[Cache] Error clearing all cache:', request.error);
        reject(request.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[Cache] Failed to clear all cache:', error);
  }
}
