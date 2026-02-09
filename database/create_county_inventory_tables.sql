-- Migration: Create County Inventory Tables
-- Description: Creates tables for county inventory categories, stores, and items.

-- ============================================
-- 1. Create County Inventory Categories Table
-- ============================================
CREATE TABLE IF NOT EXISTS county_inventory_categories (
    id TEXT PRIMARY KEY,
    county_id TEXT NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE county_inventory_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "County admins can manage inventory categories" ON county_inventory_categories
    USING (EXISTS (SELECT 1 FROM users JOIN counties ON counties.admin_id = users.id WHERE users.id = auth.uid() AND counties.id = county_inventory_categories.county_id))
    WITH CHECK (EXISTS (SELECT 1 FROM users JOIN counties ON counties.admin_id = users.id WHERE users.id = auth.uid() AND counties.id = county_inventory_categories.county_id));

CREATE POLICY "Read access for relevant users" ON county_inventory_categories
    FOR SELECT USING (true); -- Simplified for fetching


-- ============================================
-- 2. Create County Stores Table
-- ============================================
CREATE TABLE IF NOT EXISTS county_stores (
    id TEXT PRIMARY KEY,
    county_id TEXT NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location_name TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE county_stores ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "County admins can manage stores" ON county_stores
    USING (EXISTS (SELECT 1 FROM users JOIN counties ON counties.admin_id = users.id WHERE users.id = auth.uid() AND counties.id = county_stores.county_id))
    WITH CHECK (EXISTS (SELECT 1 FROM users JOIN counties ON counties.admin_id = users.id WHERE users.id = auth.uid() AND counties.id = county_stores.county_id));

CREATE POLICY "Read access for relevant users" ON county_stores
    FOR SELECT USING (true);


-- ============================================
-- 3. Create County Inventory Items Table
-- ============================================
CREATE TABLE IF NOT EXISTS county_inventory (
    id TEXT PRIMARY KEY,
    county_id TEXT NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    unit TEXT,
    supplier_name TEXT,
    status TEXT CHECK (status IN ('at_hq', 'in_transit', 'received')),
    target_institution_id TEXT REFERENCES institutions(id) ON DELETE SET NULL,
    driver_name TEXT,
    delivery_method TEXT CHECK (delivery_method IN ('driver', 'parcel')),
    tracking_number TEXT,
    qr_code TEXT,
    at_hq_date TIMESTAMP WITH TIME ZONE,
    recipient_signature TEXT,
    received_by TEXT,
    recipient_name TEXT,
    dispatched_date TIMESTAMP WITH TIME ZONE,
    received_date TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE county_inventory ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "County admins can manage inventory" ON county_inventory
    USING (EXISTS (SELECT 1 FROM users JOIN counties ON counties.admin_id = users.id WHERE users.id = auth.uid() AND counties.id = county_inventory.county_id))
    WITH CHECK (EXISTS (SELECT 1 FROM users JOIN counties ON counties.admin_id = users.id WHERE users.id = auth.uid() AND counties.id = county_inventory.county_id));

CREATE POLICY "Institutions can view incoming/received inventory" ON county_inventory
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE institution_id = county_inventory.target_institution_id
        ) OR EXISTS (
            SELECT 1 FROM users JOIN counties ON counties.admin_id = users.id WHERE users.id = auth.uid() AND counties.id = county_inventory.county_id
        )
    );

CREATE POLICY "Institutions can update received inventory" ON county_inventory
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE institution_id = county_inventory.target_institution_id
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE institution_id = county_inventory.target_institution_id
        )
    );
