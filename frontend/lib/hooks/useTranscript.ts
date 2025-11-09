import { useState, useEffect, useCallback, useRef } from "react";
import {
  getTranscript,
  type TranscriptResponse as OrchestratorResponse,
  type OrchestratorProgress,
  type TranscriptSource
} from "@/lib/services/transcriptOrchestrator";
import type { TranscriptResponse, TranscriptError } from "@/lib/types/transcript";

/**
 * Hook return type
 */
interface UseTranscriptReturn {
  transcript: TranscriptResponse | null;
  loading: boolean;
  error: TranscriptError | null;
  source: "youtube" | "web_speech" | "cache" | "none";
  progress: number; // 0-100
  loadingMessage: string;
  refetch: () => Promise<void>;
}

/**
 * Maps orchestrator source to hook source type
 */
function mapSource(
  orchestratorSource: TranscriptSource,
  cached?: boolean
): "youtube" | "web_speech" | "cache" | "none" {
  if (cached) return "cache";
  if (orchestratorSource === "youtube") return "youtube";
  if (orchestratorSource === "web_speech") return "web_speech";
  return "none";
}

/**
 * Maps orchestrator error to TranscriptError
 */
function mapError(
  orchestratorResponse: OrchestratorResponse
): TranscriptError | null {
  if (orchestratorResponse.status !== "error") return null;

  const message = orchestratorResponse.message;
  let errorType: TranscriptError["type"] = "network_error";
  let retryable = true;

  // Determine error type from message
  if (message.includes("not found") || message.includes("Invalid video ID")) {
    errorType = "invalid_video";
    retryable = false;
  } else if (message.includes("No captions available")) {
    errorType = "no_captions";
    retryable = false;
  } else if (message.includes("not supported")) {
    errorType = "browser_unsupported";
    retryable = false;
  } else if (message.includes("Network error") || message.includes("connection")) {
    errorType = "network_error";
    retryable = true;
  }

  return {
    type: errorType,
    message,
    source: orchestratorResponse.source,
    retryable
  };
}

/**
 * Gets user-friendly loading message from orchestrator progress
 */
function getLoadingMessage(progress: OrchestratorProgress): string {
  const { stage, message, currentAttempt, maxAttempts } = progress;

  switch (stage) {
    case "cache_check":
      return "Checking cache...";
    case "youtube_fetch":
      if (currentAttempt && maxAttempts && currentAttempt > 1) {
        return `Retrying... (${currentAttempt}/${maxAttempts})`;
      }
      return "Loading transcript from YouTube...";
    case "web_speech_extract":
      // Use the detailed message from Web Speech (e.g., "Extracting live transcript... (3/45 sentences)")
      return message || "Extracting live transcript...";
    case "processing":
      return "Saving to cache...";
    case "completed":
      return "Ready!";
    case "error":
      return message || "Error loading transcript";
    default:
      return message || "Loading...";
  }
}

/**
 * React hook for fetching and managing video transcripts
 *
 * Features:
 * - Automatic cache checking (instant load if cached)
 * - Intelligent fallback: YouTube → Web Speech API
 * - Real-time progress tracking with user-friendly messages
 * - Comprehensive error handling
 * - Refetch capability
 *
 * @param videoId - YouTube video ID
 * @param language - Language code (default: 'en')
 * @returns Transcript data, loading state, error, source, progress, and refetch function
 *
 * @example
 * ```typescript
 * const { transcript, loading, error, source, progress, loadingMessage, refetch } = useTranscript('dQw4w9WgXcQ', 'en');
 *
 * if (loading) {
 *   return <div>{loadingMessage} ({progress}%)</div>;
 * }
 *
 * if (error) {
 *   return <div>{error.message} {error.retryable && <button onClick={refetch}>Retry</button>}</div>;
 * }
 *
 * if (transcript) {
 *   return <div>Got {transcript.totalSentences} sentences from {source}</div>;
 * }
 * ```
 */
export function useTranscript(
  videoId: string,
  language: string = "en"
): UseTranscriptReturn {
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TranscriptError | null>(null);
  const [source, setSource] = useState<"youtube" | "web_speech" | "cache" | "none">("none");
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Track current fetch to allow cancellation/replacement
  const currentFetchRef = useRef<number>(0);

  /**
   * Load transcript with orchestrator
   */
  const loadTranscript = useCallback(async () => {
    // Increment fetch ID to track this specific fetch
    const fetchId = ++currentFetchRef.current;

    try {
      // Reset state
      setLoading(true);
      setError(null);
      setProgress(0);
      setLoadingMessage("Initializing...");

      console.log(`[useTranscript] Starting fetch for ${videoId} (${language})`);

      // Fetch transcript with progress tracking
      const result = await getTranscript(videoId, {
        language,
        forceRefresh: false,
        onProgress: (orchestratorProgress: OrchestratorProgress) => {
          // Only update if this is still the current fetch and component is mounted
          if (fetchId === currentFetchRef.current && isMountedRef.current) {
            const message = getLoadingMessage(orchestratorProgress);
            const percentage = Math.round(orchestratorProgress.percentage);

            setProgress(percentage);
            setLoadingMessage(message);

            console.log(`[useTranscript] Progress: ${percentage}% - ${message}`);
          }
        }
      });

      // Only update state if this is still the current fetch and component is mounted
      if (fetchId !== currentFetchRef.current || !isMountedRef.current) {
        console.log(`[useTranscript] Fetch ${fetchId} cancelled or component unmounted`);
        return;
      }

      console.log(`[useTranscript] Fetch complete:`, result);

      // Map orchestrator response to hook response
      if (result.status === "success") {
        const mappedSource = mapSource(result.source, result.cached);
        const transcriptResponse: TranscriptResponse = {
          status: "success",
          source: mappedSource,
          transcript: result.transcript,
          totalSentences: result.totalSentences,
          confidence: result.confidence,
          language: result.language,
          message: result.message,
          processingTime: result.processingTime,
          cached: result.cached || false
        };

        setTranscript(transcriptResponse);
        setSource(mappedSource);
        setError(null);
        setProgress(100);
        setLoadingMessage("Ready!");
      } else {
        // Handle error
        const mappedError = mapError(result);
        const mappedSource = mapSource(result.source, false);

        setTranscript(null);
        setSource(mappedSource);
        setError(mappedError);
        setProgress(100);
        setLoadingMessage(mappedError?.message || "Error loading transcript");
      }
    } catch (err) {
      // Only update if this is still the current fetch and component is mounted
      if (fetchId !== currentFetchRef.current || !isMountedRef.current) {
        return;
      }

      console.error(`[useTranscript] Unexpected error:`, err);

      // Handle unexpected errors
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      const transcriptError: TranscriptError = {
        type: "network_error",
        message: errorMessage,
        retryable: true
      };

      setTranscript(null);
      setSource("none");
      setError(transcriptError);
      setProgress(100);
      setLoadingMessage(errorMessage);
    } finally {
      // Only update loading state if this is still the current fetch and component is mounted
      if (fetchId === currentFetchRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [videoId, language]);

  /**
   * Refetch transcript (e.g., for retry button)
   */
  const refetch = useCallback(async () => {
    console.log(`[useTranscript] Manual refetch requested`);
    await loadTranscript();
  }, [loadTranscript]);

  /**
   * Load transcript on mount or when videoId/language changes
   */
  useEffect(() => {
    if (videoId) {
      loadTranscript();
    }
  }, [videoId, language, loadTranscript]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      console.log(`[useTranscript] Component unmounted`);
    };
  }, []);

  return {
    transcript,
    loading,
    error,
    source,
    progress,
    loadingMessage,
    refetch
  };
}
