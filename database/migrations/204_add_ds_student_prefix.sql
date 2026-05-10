-- Migration 204: Add student ID prefix to ds_settings
ALTER TABLE ds_settings 
ADD COLUMN IF NOT EXISTS student_id_prefix TEXT DEFAULT 'ID-';
