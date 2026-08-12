-- Migration: 306_institution_module_states.sql (v2 - deadlock fix)
-- Removes the DO $$ block that caused a deadlock when checking pg_policies.
-- Run this in Supabase SQL Editor.

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

CREATE INDEX IF NOT EXISTS idx_institution_module_states_inst_id ON institution_module_states (institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_module_states_module_id ON institution_module_states (module_id);

ALTER TABLE institution_module_states ENABLE ROW LEVEL SECURITY;

-- Drop policy first to avoid conflict, then recreate cleanly
DROP POLICY IF EXISTS "Allow public all access on institution_module_states" ON institution_module_states;

CREATE POLICY "Allow public all access on institution_module_states"
ON institution_module_states
FOR ALL
USING (true)
WITH CHECK (true);

GRANT ALL ON institution_module_states TO anon;
GRANT ALL ON institution_module_states TO authenticated;
GRANT ALL ON institution_module_states TO service_role;
