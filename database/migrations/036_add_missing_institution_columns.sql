-- Migration: Add missing columns to institutions table
-- Purpose: Support Retail & Agency tab visibility and marketplace settings

ALTER TABLE institutions ADD COLUMN IF NOT EXISTS business_sub_type TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS listing_quota INTEGER DEFAULT 0;
