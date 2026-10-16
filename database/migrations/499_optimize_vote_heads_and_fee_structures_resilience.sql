-- Migration 499: Optimize vote_heads and fee_structures Indexes, Resilience, and RLS
-- Resolves statement timeout (57014) on vote_heads and fee_structures operations
--
-- 1. Ensure public.vote_heads and public.fee_structures tables exist with proper schema and defaults
-- 2. Drop any lock-prone foreign keys referencing vote_heads or fee_structures
-- 3. Create high-performance composite indexes for multi-tenant queries, sorting, and filtering
-- 4. Apply master permissive RLS policies for public, anon, authenticated, and service_role
-- 5. Grant explicit permissions, analyze statistics, and notify PostgREST schema cache reload

SET statement_timeout = '1min';

DO $$
BEGIN
    -- 1. Ensure Table and Columns Exist for vote_heads
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'vote_heads'
    ) THEN
        ALTER TABLE public.vote_heads ADD COLUMN IF NOT EXISTS id TEXT;
        ALTER TABLE public.vote_heads ADD COLUMN IF NOT EXISTS name TEXT;
        ALTER TABLE public.vote_heads ADD COLUMN IF NOT EXISTS allocated_amount NUMERIC(15, 2) DEFAULT 0;
        ALTER TABLE public.vote_heads ADD COLUMN IF NOT EXISTS amount_spent NUMERIC(15, 2) DEFAULT 0;
        ALTER TABLE public.vote_heads ADD COLUMN IF NOT EXISTS academic_year_id TEXT;
        ALTER TABLE public.vote_heads ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
        ALTER TABLE public.vote_heads ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.vote_heads ADD COLUMN IF NOT EXISTS is_percentage BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.vote_heads ADD COLUMN IF NOT EXISTS percentage DOUBLE PRECISION DEFAULT 0.0;
        ALTER TABLE public.vote_heads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.vote_heads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ELSE
        CREATE TABLE IF NOT EXISTS public.vote_heads (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            allocated_amount NUMERIC(15, 2) DEFAULT 0,
            amount_spent NUMERIC(15, 2) DEFAULT 0,
            academic_year_id TEXT,
            priority INTEGER DEFAULT 0,
            institution_id TEXT NOT NULL,
            is_percentage BOOLEAN DEFAULT FALSE,
            percentage DOUBLE PRECISION DEFAULT 0.0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Ensure Table and Columns Exist for fee_structures
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'fee_structures'
    ) THEN
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS id TEXT;
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS name TEXT;
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2) DEFAULT 0.00;
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) DEFAULT 0.00;
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS academic_year_id TEXT;
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS term TEXT;
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS course_id TEXT;
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS course_level_id TEXT;
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS vote_head_id TEXT;
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS applicable_to TEXT DEFAULT 'all';
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ELSE
        CREATE TABLE IF NOT EXISTS public.fee_structures (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            amount DECIMAL(12, 2) DEFAULT 0.00,
            total_amount DECIMAL(12, 2) DEFAULT 0.00,
            academic_year_id TEXT,
            term TEXT,
            course_id TEXT,
            course_level_id TEXT,
            vote_head_id TEXT,
            priority INTEGER DEFAULT 0,
            institution_id TEXT NOT NULL,
            applicable_to TEXT DEFAULT 'all',
            items JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Drop any lock-prone foreign keys referencing vote_heads or fee_structures
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname, conrelid::regclass::text as tablename
        FROM   pg_constraint
        WHERE  (conrelid IN ('public.vote_heads'::regclass, 'public.fee_structures'::regclass)
                OR confrelid IN ('public.vote_heads'::regclass, 'public.fee_structures'::regclass))
        AND contype = 'f'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I CASCADE;', r.tablename, r.conname);
            RAISE NOTICE 'Dropped FK % from %', r.conname, r.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop FK % from %: %', r.conname, r.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- 3. High-performance composite and tenancy indexes
CREATE INDEX IF NOT EXISTS idx_vote_heads_institution_id 
    ON public.vote_heads(institution_id);

CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_id_desc 
    ON public.vote_heads(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_id_asc 
    ON public.vote_heads(institution_id, id ASC);

CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_created 
    ON public.vote_heads(institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_priority 
    ON public.vote_heads(institution_id, priority);

CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_name 
    ON public.vote_heads(institution_id, name);

CREATE INDEX IF NOT EXISTS idx_vote_heads_academic_year 
    ON public.vote_heads(institution_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_fee_structures_institution_id 
    ON public.fee_structures(institution_id);

CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_id_desc 
    ON public.fee_structures(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_id_asc 
    ON public.fee_structures(institution_id, id ASC);

CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_academic_year 
    ON public.fee_structures(institution_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_created 
    ON public.fee_structures(institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_vote_head 
    ON public.fee_structures(institution_id, vote_head_id);

-- 4. Enable RLS and establish master permissive policies
ALTER TABLE public.vote_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename IN ('vote_heads', 'fee_structures')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

CREATE POLICY "vote_heads_all_access" ON public.vote_heads
    FOR ALL
    TO public, anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "fee_structures_all_access" ON public.fee_structures
    FOR ALL
    TO public, anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 5. Explicit Grants to all application roles
GRANT ALL ON public.vote_heads TO anon, authenticated, service_role;
GRANT ALL ON public.fee_structures TO anon, authenticated, service_role;

-- 6. Update PostgreSQL query planner statistics
ANALYZE public.vote_heads;
ANALYZE public.fee_structures;

-- 7. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
