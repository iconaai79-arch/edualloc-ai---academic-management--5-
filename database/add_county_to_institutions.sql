-- Migration: Add county_id to institutions table
-- This migration links institutions to their respective counties

-- Add county_id column to institutions table
ALTER TABLE institutions 
ADD COLUMN IF NOT EXISTS county_id TEXT;

-- Add foreign key constraint
ALTER TABLE institutions
ADD CONSTRAINT fk_institution_county 
    FOREIGN KEY (county_id) 
    REFERENCES counties(id) 
    ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_institutions_county_id ON institutions(county_id);

-- Add comment to column
COMMENT ON COLUMN institutions.county_id IS 'ID of the county this institution belongs to (optional)';

-- Update RLS policies for institutions to allow county admins to view/manage institutions in their county
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
