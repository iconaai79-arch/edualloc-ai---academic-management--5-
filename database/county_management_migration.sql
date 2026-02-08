-- Combined County Management Migration
-- Execute this script to add county management functionality to the database

-- ============================================
-- STEP 1: Create Counties Table
-- ============================================

CREATE TABLE IF NOT EXISTS counties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    admin_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    location JSONB,
    
    CONSTRAINT fk_county_admin 
        FOREIGN KEY (admin_id) 
        REFERENCES users(id) 
        ON DELETE SET NULL
);

-- ============================================
-- STEP 2: Create Indexes for Counties
-- ============================================

CREATE INDEX IF NOT EXISTS idx_counties_name ON counties(name);
CREATE INDEX IF NOT EXISTS idx_counties_code ON counties(code);
CREATE INDEX IF NOT EXISTS idx_counties_admin_id ON counties(admin_id);
CREATE INDEX IF NOT EXISTS idx_counties_status ON counties(status);
CREATE INDEX IF NOT EXISTS idx_counties_created_at ON counties(created_at);

-- ============================================
-- STEP 3: Add Comments to Counties Table
-- ============================================

COMMENT ON TABLE counties IS 'Stores county government information for managing institutions at the county level';
COMMENT ON COLUMN counties.id IS 'Unique identifier for the county (format: county_timestamp)';
COMMENT ON COLUMN counties.name IS 'Official name of the county';
COMMENT ON COLUMN counties.code IS 'Unique county code (e.g., NRB-001 for Nairobi)';
COMMENT ON COLUMN counties.email IS 'Official contact email for the county';
COMMENT ON COLUMN counties.phone_number IS 'Official contact phone number for the county';
COMMENT ON COLUMN counties.admin_id IS 'ID of the user assigned as county administrator (must have county_admin role)';
COMMENT ON COLUMN counties.status IS 'Current status of the county (active or suspended)';
COMMENT ON COLUMN counties.created_at IS 'Timestamp when the county was registered';
COMMENT ON COLUMN counties.location IS 'Optional GPS coordinates and location metadata in JSON format';

-- ============================================
-- STEP 4: Enable RLS and Create Policies for Counties
-- ============================================

ALTER TABLE counties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins have full access to counties" ON counties;
DROP POLICY IF EXISTS "County admins can view their assigned county" ON counties;
DROP POLICY IF EXISTS "County admins can update their assigned county" ON counties;

-- Super admins have full access
CREATE POLICY "Super admins have full access to counties"
    ON counties
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

-- County admins can view their assigned county
CREATE POLICY "County admins can view their assigned county"
    ON counties
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'county_admin'
            AND users.id = counties.admin_id
        )
    );

-- County admins can update their assigned county
CREATE POLICY "County admins can update their assigned county"
    ON counties
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'county_admin'
            AND users.id = counties.admin_id
        )
    );

-- ============================================
-- STEP 5: Add county_id to Institutions Table
-- ============================================

ALTER TABLE institutions 
ADD COLUMN IF NOT EXISTS county_id TEXT;

-- ============================================
-- STEP 6: Add Foreign Key Constraint
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_institution_county'
    ) THEN
        ALTER TABLE institutions
        ADD CONSTRAINT fk_institution_county 
            FOREIGN KEY (county_id) 
            REFERENCES counties(id) 
            ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- STEP 7: Create Index for Institutions
-- ============================================

CREATE INDEX IF NOT EXISTS idx_institutions_county_id ON institutions(county_id);

-- ============================================
-- STEP 8: Add Comment to Institutions Column
-- ============================================

COMMENT ON COLUMN institutions.county_id IS 'ID of the county this institution belongs to (optional)';

-- ============================================
-- STEP 9: Create RLS Policies for County Admins on Institutions
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "County admins can view institutions in their county" ON institutions;
DROP POLICY IF EXISTS "County admins can update institutions in their county" ON institutions;
DROP POLICY IF EXISTS "County admins can insert institutions in their county" ON institutions;

-- County admins can view institutions in their county
CREATE POLICY "County admins can view institutions in their county"
    ON institutions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN counties c ON c.admin_id = u.id
            WHERE u.id = auth.uid()
            AND u.role = 'county_admin'
            AND institutions.county_id = c.id
        )
    );

-- County admins can update institutions in their county
CREATE POLICY "County admins can update institutions in their county"
    ON institutions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN counties c ON c.admin_id = u.id
            WHERE u.id = auth.uid()
            AND u.role = 'county_admin'
            AND institutions.county_id = c.id
        )
    );

-- County admins can insert institutions in their county
CREATE POLICY "County admins can insert institutions in their county"
    ON institutions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            JOIN counties c ON c.admin_id = u.id
            WHERE u.id = auth.uid()
            AND u.role = 'county_admin'
            AND institutions.county_id = c.id
        )
    );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify the migration
SELECT 'Counties table created successfully' AS status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'counties');

SELECT 'county_id column added to institutions' AS status
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'institutions' AND column_name = 'county_id'
);
