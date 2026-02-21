-- Migration for Push Notifications and Trade Reputation features
-- Run this against your PostgreSQL database

-- Push Tokens table for storing Expo push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active);

-- Trade Ratings table for reputation system
CREATE TABLE IF NOT EXISTS trade_ratings (
  rating_id VARCHAR(255) PRIMARY KEY,
  trade_id VARCHAR(255) NOT NULL REFERENCES trades(trade_id) ON DELETE CASCADE,
  rater_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  rated_user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Prevent duplicate ratings
  UNIQUE (trade_id, rater_id)
);

-- Indexes for trade ratings
CREATE INDEX IF NOT EXISTS idx_trade_ratings_rated_user ON trade_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_trade_ratings_trade ON trade_ratings(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_ratings_created ON trade_ratings(created_at);

-- Verify tables exist (for diagnostic purposes)
SELECT 'push_tokens table created' as status WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'push_tokens');
SELECT 'trade_ratings table created' as status WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trade_ratings');
