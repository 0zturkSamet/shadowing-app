export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  view_count: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
  last_login: string;
}

export interface UserProgress {
  user_id: string;
  total_phrases_practiced: number;
  total_videos_completed: number;
  average_score: number;
  current_streak: number;
  best_streak: number;
  total_practice_time: number;
  level: string;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

export interface Phrase {
  id: string;
  text: string;
  start_time: number;
  end_time: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  video_id: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  video_id: string;
  phrase_id: string;
  score: number;
  recording_url?: string;
  created_at: string;
}

export interface SearchParams {
  query?: string;
  language?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  learning_language: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface AuthError {
  error: string;
  message: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  learning_language: string;
}
