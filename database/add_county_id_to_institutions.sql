-- Migration to add county_id to institutions table
-- This allows linking institutions to specific counties for administrative oversight

ALTER TABLE institutions ADD COLUMN IF NOT EXISTS county_id TEXT REFERENCES counties(id) ON DELETE SET NULL;

-- Create an index for better performance when filtering by county
CREATE INDEX IF NOT EXISTS idx_institutions_county_id ON institutions(county_id);
