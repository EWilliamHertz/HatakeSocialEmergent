-- Migration to add new columns to collection_items and marketplace_listings
-- Run this on your Neon PostgreSQL database

-- Add new columns to collection_items
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS finish VARCHAR(100) DEFAULT 'Normal';
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS is_graded BOOLEAN DEFAULT FALSE;
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS grading_company VARCHAR(50);
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS grade_value VARCHAR(20);
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS custom_image_url TEXT;

-- Make card_data nullable with default empty object
ALTER TABLE collection_items ALTER COLUMN card_data SET DEFAULT '{}';
ALTER TABLE collection_items ALTER COLUMN card_data DROP NOT NULL;

-- Add new columns to marketplace_listings
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS finish VARCHAR(100) DEFAULT 'Normal';
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS is_graded BOOLEAN DEFAULT FALSE;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS grading_company VARCHAR(50);
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS grade_value VARCHAR(20);
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS custom_image_url TEXT;

-- Make card_data nullable with default empty object
ALTER TABLE marketplace_listings ALTER COLUMN card_data SET DEFAULT '{}';
ALTER TABLE marketplace_listings ALTER COLUMN card_data DROP NOT NULL;

-- Update currency default to EUR
ALTER TABLE marketplace_listings ALTER COLUMN currency SET DEFAULT 'EUR';
