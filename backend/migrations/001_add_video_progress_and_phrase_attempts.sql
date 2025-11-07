-- Migration: Add video_progress and phrase_attempts tables
-- Description: Adds tables for tracking video playback progress and phrase practice attempts
-- Date: 2025-11-07

-- Create video_progress table
CREATE TABLE IF NOT EXISTS video_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    current_timestamp DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    completed_at TIMESTAMP,
    total_watch_time INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT idx_video_progress_user_video UNIQUE (user_id, video_id)
);

-- Create indexes for video_progress
CREATE INDEX IF NOT EXISTS idx_video_progress_user_id ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video_id ON video_progress(video_id);

-- Create phrase_attempts table
CREATE TABLE IF NOT EXISTS phrase_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    phrase_index INTEGER NOT NULL,
    phrase_text VARCHAR(1000) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 1,
    correct BOOLEAN NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for phrase_attempts
CREATE INDEX IF NOT EXISTS idx_phrase_attempts_user_id ON phrase_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_phrase_attempts_video_id ON phrase_attempts(video_id);
CREATE INDEX IF NOT EXISTS idx_phrase_attempts_user_video ON phrase_attempts(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_phrase_attempts_user_video_phrase ON phrase_attempts(user_id, video_id, phrase_index);

-- Comments
COMMENT ON TABLE video_progress IS 'Tracks user video playback progress and completion status';
COMMENT ON TABLE phrase_attempts IS 'Records user phrase practice attempts and accuracy';

COMMENT ON COLUMN video_progress.current_timestamp IS 'Current playback position in seconds';
COMMENT ON COLUMN video_progress.completed_at IS 'Timestamp when video was completed (NULL if not completed)';
COMMENT ON COLUMN video_progress.total_watch_time IS 'Total time user has spent watching this video in seconds';

COMMENT ON COLUMN phrase_attempts.phrase_index IS 'Index of the phrase in the video transcript';
COMMENT ON COLUMN phrase_attempts.attempts IS 'Number of times user has attempted this phrase';
COMMENT ON COLUMN phrase_attempts.correct IS 'Whether the latest attempt was correct';
