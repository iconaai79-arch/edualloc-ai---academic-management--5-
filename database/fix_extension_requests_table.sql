-- Migration to fix institution_extension_requests table
-- Removes unnecessary foreign key constraints and ensures column consistency

-- 1. Create the table correctly if it doesn't exist
CREATE TABLE IF NOT EXISTS institution_extension_requests (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    requester_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by TEXT
);

-- 2. If table exists, remove the FK constraints just in case they are causing issues
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'institution_extension_requests_requester_id_fkey'
    ) THEN
        ALTER TABLE institution_extension_requests DROP CONSTRAINT institution_extension_requests_requester_id_fkey;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'institution_extension_requests_resolved_by_fkey'
    ) THEN
        ALTER TABLE institution_extension_requests DROP CONSTRAINT institution_extension_requests_resolved_by_fkey;
    END IF;
END $$;

-- 3. Ensure all columns exist (in case it was created with the older redundant definition)
ALTER TABLE institution_extension_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE institution_extension_requests ADD COLUMN IF NOT EXISTS resolved_by TEXT;
