export interface VideoResponse {
  id: string;
  youtube_id: string;
  title: string;
  duration: number;
  language: string;
  channel_name: string;
  thumbnail_url: string;
  view_count: number;
}

export interface PhraseSchema {
  text: string;
  start_time: number;
  duration: number;
}

export interface TranscriptResponse {
  video_id: string;
  phrases: PhraseSchema[];
}

export interface VideoSearchResponse {
  videos: VideoResponse[];
  total_results: number;
  query: string;
  language: string;
}

// Video Player specific types
export interface VideoProgress {
  video_id: string;
  current_timestamp: number;
  completed: boolean;
  last_updated: string;
}

export interface VideoPlayerResponse {
  video: VideoResponse;
  phrases: PhraseSchema[];
  progress?: VideoProgress;
}

export interface VideoProgressUpdateRequest {
  video_id: string;
  timestamp: number;
  completed: boolean;
}

export interface PhraseAttempt {
  phrase_index: number;
  correct: boolean;
  timestamp: number;
}

export interface PhraseAttemptRequest {
  video_id: string;
  phrase_index: number;
  correct: boolean;
}

export interface UserStatsResponse {
  total_videos_watched: number;
  total_practice_time: number;
  total_phrases_practiced: number;
  accuracy_rate: number;
  streak_days: number;
  level: number;
  xp: number;
}

export interface PracticeAttempt {
  phrase_index: number;
  attempts: number;
  revealed: boolean;
}
