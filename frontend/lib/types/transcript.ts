/**
 * Represents a single sentence/phrase in a transcript
 */
export interface TranscriptSentence {
  sentence_id: number;
  text: string;
  start_time: number; // in seconds
  end_time: number; // in seconds
  confidence: number; // 0-1
}

/**
 * Complete transcript data returned from API
 */
export interface TranscriptData {
  video_id: string;
  transcript: TranscriptSentence[];
  status: "completed" | "processing" | "failed";
  source: "assembly_ai" | "youtube";
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
