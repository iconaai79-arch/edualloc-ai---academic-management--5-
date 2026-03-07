-- Migration: 046_create_carwash_add_ons
-- Description: Creates table for car wash add-ons with pricing.

CREATE TABLE IF NOT EXISTS carwash_add_ons (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE carwash_add_ons ENABLE ROW LEVEL SECURITY;

-- Create Policy
CREATE POLICY "Institution staff can manage carwash_add_ons" ON carwash_add_ons
    FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

-- Insert default add-ons for existing institutions as a starting point if needed, 
-- but better to let them define their own prices.
