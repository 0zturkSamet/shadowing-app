-- Migration: Add Google OAuth support to User model
-- Date: 2025-11-12
-- Description: Add google_id field and make password_hash nullable for OAuth users

-- Add google_id column with unique constraint and index
ALTER TABLE users
ADD COLUMN google_id VARCHAR(255) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Make password_hash nullable for OAuth users
ALTER TABLE users
ALTER COLUMN password_hash DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.google_id IS 'Google OAuth user ID (sub claim from ID token)';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt password hash (nullable for OAuth users)';
