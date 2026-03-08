-- Migration: 068_carwash_branding
-- Description: Adds branding fields (logo, receipt header, receipt footer) to carwash_settings.

ALTER TABLE carwash_settings
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS receipt_header TEXT,
ADD COLUMN IF NOT EXISTS receipt_footer TEXT;
