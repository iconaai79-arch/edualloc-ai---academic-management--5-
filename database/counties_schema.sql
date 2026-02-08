-- Counties Table Schema
-- This table stores county government information for managing institutions at the county level

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
    
    -- Foreign key constraint
    CONSTRAINT fk_county_admin 
        FOREIGN KEY (admin_id) 
        REFERENCES users(id) 
        ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_counties_name ON counties(name);
CREATE INDEX IF NOT EXISTS idx_counties_code ON counties(code);
CREATE INDEX IF NOT EXISTS idx_counties_admin_id ON counties(admin_id);
CREATE INDEX IF NOT EXISTS idx_counties_status ON counties(status);
CREATE INDEX IF NOT EXISTS idx_counties_created_at ON counties(created_at);

-- Add comment to table
COMMENT ON TABLE counties IS 'Stores county government information for managing institutions at the county level';

-- Add comments to columns
COMMENT ON COLUMN counties.id IS 'Unique identifier for the county (format: county_timestamp)';
COMMENT ON COLUMN counties.name IS 'Official name of the county';
COMMENT ON COLUMN counties.code IS 'Unique county code (e.g., NRB-001 for Nairobi)';
COMMENT ON COLUMN counties.email IS 'Official contact email for the county';
COMMENT ON COLUMN counties.phone_number IS 'Official contact phone number for the county';
COMMENT ON COLUMN counties.admin_id IS 'ID of the user assigned as county administrator (must have county_admin role)';
COMMENT ON COLUMN counties.status IS 'Current status of the county (active or suspended)';
COMMENT ON COLUMN counties.created_at IS 'Timestamp when the county was registered';
COMMENT ON COLUMN counties.location IS 'Optional GPS coordinates and location metadata in JSON format';

-- Enable Row Level Security (RLS)
ALTER TABLE counties ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super admins can do everything
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

-- RLS Policy: County admins can view their assigned county
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

-- RLS Policy: County admins can update their assigned county
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

-- Sample data (optional - uncomment to insert)
/*
INSERT INTO counties (id, name, code, email, phone_number, status, created_at) VALUES
    ('county_1', 'Nairobi County', 'NRB-001', 'info@nairobi.go.ke', '+254-20-2222222', 'active', NOW()),
    ('county_2', 'Mombasa County', 'MSA-002', 'info@mombasa.go.ke', '+254-41-2222222', 'active', NOW()),
    ('county_3', 'Kisumu County', 'KSM-003', 'info@kisumu.go.ke', '+254-57-2222222', 'active', NOW()),
    ('county_4', 'Nakuru County', 'NKR-004', 'info@nakuru.go.ke', '+254-51-2222222', 'active', NOW()),
    ('county_5', 'Kiambu County', 'KMB-005', 'info@kiambu.go.ke', '+254-66-2222222', 'active', NOW());
*/
