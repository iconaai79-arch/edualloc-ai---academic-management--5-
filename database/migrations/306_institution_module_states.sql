-- Migration: 306_institution_module_states.sql
-- Description: Creates institution_module_states table to resolve 401 Unauthorized errors
-- when the app attempts to persist module activation state remotely via Supabase.

CREATE TABLE IF NOT EXISTS institution_module_states (
    id VARCHAR(200) PRIMARY KEY,
    institution_id VARCHAR(100),
    "moduleId" VARCHAR(100),
    module_id VARCHAR(100),
    data JSONB DEFAULT '{}'::jsonb,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast institution lookups
CREATE INDEX IF NOT EXISTS idx_institution_module_states_inst_id ON institution_module_states (institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_module_states_module_id ON institution_module_states (module_id);

-- Enable Row Level Security
ALTER TABLE institution_module_states ENABLE ROW LEVEL SECURITY;

-- Permissive policy: allow anon and authenticated users full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'institution_module_states'
        AND policyname = 'Allow public all access on institution_module_states'
    ) THEN
        CREATE POLICY "Allow public all access on institution_module_states"
        ON institution_module_states
        FOR ALL
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Grant access to anon and authenticated roles (Supabase default roles)
GRANT ALL ON institution_module_states TO anon;
GRANT ALL ON institution_module_states TO authenticated;
GRANT ALL ON institution_module_states TO service_role;
