-- Migration: 484_ds_branches_schema_resilience.sql
-- Description: Ensure branches table exists and has all operational columns,
-- safe manager_user_id references, permissive RLS policies, and performance indexes.

-- 1. Ensure public.branches table exists
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
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

-- 2. Dynamically add missing columns if branches table already existed previously
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches') THEN
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS code TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS manager_user_id TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS linked_institution_id TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. Indexes for branch lookups
CREATE INDEX IF NOT EXISTS idx_branches_institution ON public.branches(institution_id);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON public.branches(institution_id, is_active);
CREATE INDEX IF NOT EXISTS idx_branches_code ON public.branches(institution_id, code);

-- 4. Enable RLS and permissive policies for multi-tenant access
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'branches_select_all') THEN
        CREATE POLICY branches_select_all ON public.branches FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'branches_insert_all') THEN
        CREATE POLICY branches_insert_all ON public.branches FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'branches_update_all') THEN
        CREATE POLICY branches_update_all ON public.branches FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'branches' AND policyname = 'branches_delete_all') THEN
        CREATE POLICY branches_delete_all ON public.branches FOR DELETE USING (true);
    END IF;
END $$;

-- 5. Backfill default branch for all driving school institutions
INSERT INTO public.branches (id, institution_id, name, location, code, is_active)
SELECT 
    'br_main_' || id,
    id,
    'Main Campus / HQ',
    COALESCE(address, 'Main Location'),
    'MAIN',
    TRUE
FROM public.institutions
WHERE (institution_type ILIKE '%Driving%' OR category ILIKE '%Driving%')
ON CONFLICT (id) DO NOTHING;

-- 6. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
