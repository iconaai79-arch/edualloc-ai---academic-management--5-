-- Migration: 030_add_pm_listings_and_billing
-- Description: Adds table for property listings and governance columns for institutions.

-- 1. Governance columns for Institutions
ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS listing_quota INTEGER DEFAULT 5;

-- 2. Property Listings Table
CREATE TABLE IF NOT EXISTS pm_listings (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES pm_properties(id) ON DELETE CASCADE,
    unit_id TEXT REFERENCES pm_units(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    listing_type TEXT NOT NULL DEFAULT 'Sale', -- 'Sale', 'Rent'
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Published', 'Under Offer', 'Sold'
    images TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    is_promoted BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Row Level Security
ALTER TABLE pm_listings ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Public can view published listings
CREATE POLICY "Public can view published listings" ON pm_listings
    FOR SELECT USING (status = 'Published');

-- Staff can manage their listings
CREATE POLICY "Staff can manage their listings" ON pm_listings
    FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

-- Super Admins can manage all listings (if applicable)
-- Assuming Super Admin has special access through policies or other means
