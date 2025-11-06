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
