-- Migration: 351_fix_institution_module_states_columns.sql
-- Ensure institution_module_states table exists with all standard columns, camelCase aliases, and RLS policies

CREATE TABLE IF NOT EXISTS institution_module_states (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    module_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    data JSONB DEFAULT '{}'::jsonb,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    trial_ends_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    "moduleId" TEXT,
    "updatedAt" TIMESTAMPTZ
);

-- Ensure all columns exist in case table was created with partial schema
ALTER TABLE institution_module_states ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE institution_module_states ADD COLUMN IF NOT EXISTS module_id TEXT;
ALTER TABLE institution_module_states ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE institution_module_states ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE institution_module_states ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE institution_module_states ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE institution_module_states ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE institution_module_states ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE institution_module_states ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE institution_module_states ADD COLUMN IF NOT EXISTS "moduleId" TEXT;
ALTER TABLE institution_module_states ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

-- Indices
CREATE INDEX IF NOT EXISTS idx_ims_institution_id ON institution_module_states (institution_id);
CREATE INDEX IF NOT EXISTS idx_ims_module_id ON institution_module_states (module_id);

-- RLS
ALTER TABLE institution_module_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all access on institution_module_states" ON institution_module_states;
DROP POLICY IF EXISTS "Institutions can view their own module states" ON institution_module_states;
DROP POLICY IF EXISTS "Super Admins can manage all module states" ON institution_module_states;

CREATE POLICY "Allow public all access on institution_module_states"
ON institution_module_states
FOR ALL
USING (true)
WITH CHECK (true);

GRANT ALL ON institution_module_states TO anon;
GRANT ALL ON institution_module_states TO authenticated;
GRANT ALL ON institution_module_states TO service_role;
