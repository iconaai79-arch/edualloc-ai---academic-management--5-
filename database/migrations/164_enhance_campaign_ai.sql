-- Add missing fields for Aspirant and Branding management
ALTER TABLE campaign_profiles 
ADD COLUMN IF NOT EXISTS agendas JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS invite_slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS branding_status TEXT DEFAULT 'none' CHECK (branding_status IN ('none', 'pending', 'paid', 'active')),
ADD COLUMN IF NOT EXISTS branding_config JSONB DEFAULT '{}';

-- Table for branding price management (global settings)
CREATE TABLE IF NOT EXISTS branding_price_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    base_price NUMERIC DEFAULT 5000,
    renew_price NUMERIC DEFAULT 2500,
    features JSONB DEFAULT '["Branded SMS Sender ID", "AI Poster Generator", "Priority Social Media Support"]',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure invite_slug is populated if empty (using id as fallback)
UPDATE campaign_profiles SET invite_slug = id WHERE invite_slug IS NULL;
