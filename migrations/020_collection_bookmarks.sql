-- Create collection_bookmarks table for bookmarking other users' collections
CREATE TABLE IF NOT EXISTS collection_bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  bookmarked_user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookmarked_user FOREIGN KEY (bookmarked_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_bookmark UNIQUE (user_id, bookmarked_user_id),
  CONSTRAINT no_self_bookmark CHECK (user_id != bookmarked_user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON collection_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_bookmarked_user_id ON collection_bookmarks(bookmarked_user_id);
