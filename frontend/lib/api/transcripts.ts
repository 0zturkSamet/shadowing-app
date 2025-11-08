import { TranscriptData } from "@/lib/types/transcript";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Fetch transcript from backend using Assembly AI
 *
 * This uses the `/api/videos/transcripts/{video_id}` endpoint which:
 * 1. Checks Redis cache first
 * 2. Falls back to Assembly AI if not cached
 * 3. Returns sentence-level transcript with timestamps
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptData> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;

    const response = await fetch(
      `${API_BASE_URL}/api/videos/transcripts/${videoId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Video not found");
      } else if (response.status === 429) {
        throw new Error(
          "Transcription service is busy. Please try again later."
        );
      } else if (response.status === 503) {
        throw new Error("Transcription service is temporarily unavailable");
      } else if (response.status === 422) {
        throw new Error("Invalid video ID format");
      }
      throw new Error(`Failed to fetch transcript: ${response.statusText}`);
    }

    const data: TranscriptData = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching transcript:", error);
    throw error;
  }
}
