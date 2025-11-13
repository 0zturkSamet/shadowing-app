/**
 * Video API Service for ShadowSpeak
 *
 * Handles API calls to the backend for video-related operations,
 * including Whisper transcription
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Interface for Whisper transcription response
 */
export interface WhisperTranscriptResponse {
  video_id: string;
  transcript: Array<{
    sentence_id: number;
    text: string;
    start_time: number;
    end_time: number;
    confidence?: number;
  }>;
  status: string;
  processing_time: number;
  language: string;
  audio_duration?: number;
  source: string;
}

/**
 * Transcribe a YouTube video using OpenAI Whisper API
 *
 * @param youtubeUrl - YouTube video URL
 * @param language - Optional language hint (e.g., 'en', 'es', 'fr')
 * @param forceRefresh - Force refresh cached transcript
 * @returns Promise resolving to Whisper transcript response
 */
export async function transcribeWithWhisper(
  youtubeUrl: string,
  language?: string,
  forceRefresh: boolean = false
): Promise<WhisperTranscriptResponse> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;

    const response = await fetch(
      `${API_BASE_URL}/videos/transcripts/whisper`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          youtube_url: youtubeUrl,
          language: language || null,
          force_refresh: forceRefresh,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required. Please log in.");
      } else if (response.status === 404) {
        throw new Error("Video not found");
      } else if (response.status === 429) {
        throw new Error("Too many requests. Please try again later.");
      } else if (response.status === 503) {
        throw new Error("Whisper service is temporarily unavailable");
      } else if (response.status === 422) {
        throw new Error("Invalid YouTube URL format");
      }

      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.detail || `Failed to transcribe video: ${response.statusText}`
      );
    }

    const data: WhisperTranscriptResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error transcribing with Whisper:", error);
    throw error;
  }
}
