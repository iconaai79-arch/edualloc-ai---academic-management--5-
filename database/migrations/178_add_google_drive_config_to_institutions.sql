
-- Add google_drive_config column to institutions table
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS google_drive_config JSONB;
