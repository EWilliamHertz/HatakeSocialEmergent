-- Badge System Migration
-- Run: Applied automatically on first API call

CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  badge_type VARCHAR(100) NOT NULL,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  awarded_by VARCHAR(255),
  UNIQUE(user_id, badge_type)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_type ON user_badges(badge_type);
