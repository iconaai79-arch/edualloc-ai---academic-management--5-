-- Migration 490: Optimize institution_module_states indexes and query performance
-- Resolves statement timeout (57014) on institution_module_states queries

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'institution_module_states'
    ) THEN
        -- Ensure required columns exist
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS module_id TEXT;
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS "moduleId" TEXT;
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;
    ELSE
        -- Create table if missing
        CREATE TABLE IF NOT EXISTS public.institution_module_states (
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
    END IF;
END $$;

-- 1. Composite indexes for high-speed tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_ims_inst_id_desc 
    ON public.institution_module_states(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_ims_inst_module 
    ON public.institution_module_states(institution_id, module_id);

CREATE INDEX IF NOT EXISTS idx_ims_inst_updated 
    ON public.institution_module_states(institution_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ims_module_status 
    ON public.institution_module_states(module_id, status);

CREATE INDEX IF NOT EXISTS idx_ims_id 
    ON public.institution_module_states(id);

-- 2. Master permissive RLS policy
ALTER TABLE public.institution_module_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all access on institution_module_states" ON public.institution_module_states;
DROP POLICY IF EXISTS "Institutions can view their own module states" ON public.institution_module_states;
DROP POLICY IF EXISTS "Super Admins can manage all module states" ON public.institution_module_states;
DROP POLICY IF EXISTS "institution_module_states_all_access" ON public.institution_module_states;

CREATE POLICY "institution_module_states_all_access" ON public.institution_module_states
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Grant access to all application roles
GRANT ALL ON public.institution_module_states TO anon, authenticated, service_role;

-- 4. Analyze table to immediately update PostgreSQL query planner statistics
ANALYZE public.institution_module_states;

-- 5. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
