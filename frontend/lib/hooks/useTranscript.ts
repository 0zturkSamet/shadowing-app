import { useState, useEffect, useCallback, useRef } from "react";
import {
  getWhisperTranscript,
  type WhisperTranscriptResponse,
  type WhisperProgress
} from "@/lib/services/whisperService";
import type { TranscriptResponse, TranscriptError } from "@/lib/types/transcript";

/**
 * Hook return type
 */
interface UseTranscriptReturn {
  transcript: TranscriptResponse | null;
  loading: boolean;
  error: TranscriptError | null;
  source: "whisper" | "cache" | "none";
  progress: number; // 0-100
  loadingMessage: string;
  refetch: () => Promise<void>;
}

/**
 * Maps Whisper response to transcript response
 */
function mapWhisperResponse(
  whisperResponse: WhisperTranscriptResponse
): TranscriptResponse {
  return {
    status: whisperResponse.status,
    source: "whisper",
    transcript: whisperResponse.transcript,
    totalSentences: whisperResponse.totalSentences,
    confidence: whisperResponse.confidence,
    language: whisperResponse.language,
    message: whisperResponse.message,
    processingTime: whisperResponse.processingTime,
    cached: false
  };
}

/**
 * Maps Whisper error to TranscriptError
 */
function mapError(message: string): TranscriptError {
  let errorType: TranscriptError["type"] = "network_error";
  let retryable = true;

  if (message.includes("not found") || message.includes("Invalid")) {
    errorType = "invalid_video";
    retryable = false;
  } else if (message.includes("logged in") || message.includes("401")) {
    errorType = "network_error";
    retryable = false;
  } else if (message.includes("quota") || message.includes("429")) {
    errorType = "network_error";
    retryable = false;
  } else if (message.includes("unavailable") || message.includes("503")) {
    errorType = "network_error";
    retryable = true;
  }

  return {
    type: errorType,
    message,
    source: "whisper",
    retryable
  };
}

/**
 * React hook for fetching and managing video transcripts using Whisper
 *
 * @param videoId - YouTube video ID
 * @param language - Language code (optional - auto-detects if not provided)
 * @returns Transcript data, loading state, error, source, progress, and refetch function
 */
export function useTranscript(
  videoId: string,
  language?: string // No default - auto-detect language!
): UseTranscriptReturn {
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TranscriptError | null>(null);
  const [source, setSource] = useState<"whisper" | "cache" | "none">("none");
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");

  const isMountedRef = useRef(true);
  const currentFetchRef = useRef<number>(0);

  /**
   * Load transcript with Whisper
   */
  const loadTranscript = useCallback(async () => {
    const fetchId = ++currentFetchRef.current;

    try {
      setLoading(true);
      setError(null);
      setProgress(0);
      setLoadingMessage("Initializing...");

      console.log(`[useTranscript] Starting Whisper transcription for ${videoId} (${language})`);

      const result = await getWhisperTranscript(videoId, {
        language,
        forceRefresh: false,
        onProgress: (whisperProgress: WhisperProgress) => {
          if (fetchId === currentFetchRef.current && isMountedRef.current) {
            setProgress(Math.round(whisperProgress.percentage));
            setLoadingMessage(whisperProgress.message);
            console.log(`[useTranscript] Progress: ${whisperProgress.percentage}% - ${whisperProgress.message}`);
          }
        }
      });

      if (fetchId !== currentFetchRef.current || !isMountedRef.current) {
        console.log(`[useTranscript] Fetch ${fetchId} cancelled or component unmounted`);
        return;
      }

      console.log(`[useTranscript] Fetch complete:`, result);

      if (result.status === "success") {
        const transcriptResponse = mapWhisperResponse(result);
        setTranscript(transcriptResponse);
        setSource("whisper");
        setError(null);
        setProgress(100);
        setLoadingMessage("Ready!");
      } else {
        const mappedError = mapError(result.message);
        setTranscript(null);
        setSource("none");
        setError(mappedError);
        setProgress(100);
        setLoadingMessage(result.message);
      }
    } catch (err) {
      if (fetchId !== currentFetchRef.current || !isMountedRef.current) {
        return;
      }

      console.error(`[useTranscript] Unexpected error:`, err);

      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      const transcriptError = mapError(errorMessage);

      setTranscript(null);
      setSource("none");
      setError(transcriptError);
      setProgress(100);
      setLoadingMessage(errorMessage);
    } finally {
      if (fetchId === currentFetchRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [videoId, language]);

  /**
   * Refetch transcript
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, language]);

  /**
   * Set mounted state and cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;
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
