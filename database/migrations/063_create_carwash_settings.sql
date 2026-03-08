-- Migration: 063_create_carwash_settings
-- Description: Creates the carwash_settings table to manage branding and points calculation.

CREATE TABLE IF NOT EXISTS carwash_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    points_per_kes DECIMAL(12, 4) DEFAULT 1.0,
    stamps_per_wash INTEGER DEFAULT 1,
    stamps_for_free_wash INTEGER DEFAULT 10,
    redeem_value_per_point DECIMAL(12, 4) DEFAULT 1.0,
    is_loyalty_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE carwash_settings ENABLE ROW LEVEL SECURITY;

-- Create Policy
CREATE POLICY "Institution staff can manage carwash_settings" ON carwash_settings 
FOR ALL USING (institution_id = public.get_curr_user_inst_id());

-- Add unique constraint per institution
CREATE UNIQUE INDEX IF NOT EXISTS idx_carwash_settings_institution ON carwash_settings(institution_id);
