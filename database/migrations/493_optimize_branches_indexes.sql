-- Migration 493: Optimize branches indexes and query performance
-- Resolves statement timeout (57014) on branches queries

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'branches'
    ) THEN
        -- Ensure required columns exist
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS name TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS location TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS code TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS manager_user_id TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS linked_institution_id TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ELSE
        -- Create table if missing
        CREATE TABLE IF NOT EXISTS public.branches (
            id TEXT PRIMARY KEY,
            institution_id TEXT NOT NULL,
            name TEXT NOT NULL,
            location TEXT,
            code TEXT,
            phone TEXT,
            email TEXT,
            manager_user_id TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            linked_institution_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 1. Composite indexes for high-speed tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_branches_inst_id_desc 
    ON public.branches(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_branches_inst_active 
    ON public.branches(institution_id, is_active);

CREATE INDEX IF NOT EXISTS idx_branches_inst_name 
    ON public.branches(institution_id, name);

CREATE INDEX IF NOT EXISTS idx_branches_linked_inst 
    ON public.branches(linked_institution_id);

-- 2. Master permissive RLS policy
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all access on branches" ON public.branches;
DROP POLICY IF EXISTS "branches_all_access" ON public.branches;

CREATE POLICY "branches_all_access" ON public.branches
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Grant access to all application roles
GRANT ALL ON public.branches TO anon, authenticated, service_role;

-- 4. Analyze table to immediately update PostgreSQL query planner statistics
ANALYZE public.branches;

-- 5. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
