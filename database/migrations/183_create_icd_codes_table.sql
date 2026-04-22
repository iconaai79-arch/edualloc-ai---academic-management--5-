-- Create pg_trgm extension for fuzzy searching if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create ICD Codes for HIS
CREATE TABLE IF NOT EXISTS icd_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT, -- e.g. Infectious diseases, Neoplasms, etc.
    version TEXT DEFAULT 'ICD-10',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE icd_codes ENABLE ROW LEVEL SECURITY;

-- Policies: Public (authenticated) can view, Super Admin can manage
CREATE POLICY "Anyone can view ICD codes" ON icd_codes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage ICD codes" ON icd_codes
    FOR ALL TO authenticated USING (public.get_curr_user_role() = 'super_admin');

-- Add Index for searching
CREATE INDEX idx_icd_code ON icd_codes(code);
CREATE INDEX idx_icd_description ON icd_codes USING gin(description gin_trgm_ops);
