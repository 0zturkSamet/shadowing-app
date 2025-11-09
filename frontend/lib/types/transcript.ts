/**
 * Represents a single sentence/phrase in a transcript
 */
export interface TranscriptSentence {
  sentence_id: number;
  text: string;
  start_time: number; // seconds
  end_time: number; // seconds
  confidence: number; // 0-1
  sourceLanguage?: string;
}

/**
 * Complete transcript data returned from API
 */
export interface TranscriptData {
  video_id: string;
  transcript: TranscriptSentence[];
  status: "completed" | "processing" | "failed";
  source: "assembly_ai" | "youtube" | "web_speech";
  cached: boolean;
  word_count?: number;
  confidence?: number;
  language?: string;
  processing_time?: number;
}

/**
 * State for current practice session
 */
export interface PracticeState {
  currentSentenceIndex: number;
  isPlaying: boolean;
  isLooping: boolean;
  loopCount: number;
  completedSentences: Set<number>;
  currentTime: number; // video current time in seconds
  duration: number; // video total duration
}

/**
 * Keyboard shortcuts configuration
 */
export interface KeyboardShortcuts {
  play_pause: string; // "Space"
  next_sentence: string; // "N"
  previous_sentence: string; // "P"
  loop_sentence: string; // "L"
  record: string; // "R"
  help: string; // "?"
}

/**
 * Transcript response from API/service
 */
export interface TranscriptResponse {
  status: "success" | "partial" | "error";
  source: "youtube" | "web_speech" | "cache" | "none";
  transcript: TranscriptSentence[];
  totalSentences: number;
  confidence: number;
  language: string;
  message: string;
  processingTime: number; // milliseconds
  cached: boolean;
}

/**
 * Transcript error details
 */
export interface TranscriptError {
  type: "no_captions" | "network_error" | "invalid_video" | "browser_unsupported";
  message: string;
  source?: string;
  retryable: boolean;
}

/**
 * Cache statistics and entries
 */
export interface CacheStats {
  totalCached: number;
  totalSize: number; // bytes
  oldestEntry: Date;
  newestEntry: Date;
  entries: {
    videoId: string;
    source: string;
    language: string;
    cachedAt: Date;
  }[];
}
