import { useState, useEffect } from "react";
import { TranscriptData } from "@/lib/types/transcript";
import { fetchTranscript } from "@/lib/api/transcripts";

interface UseTranscriptReturn {
  transcript: TranscriptData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTranscript(videoId: string): UseTranscriptReturn {
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTranscript = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTranscript(videoId);
      setTranscript(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (videoId) {
      loadTranscript();
    }
  }, [videoId]);

  return {
    transcript,
    loading,
    error,
    refetch: loadTranscript,
  };
}
