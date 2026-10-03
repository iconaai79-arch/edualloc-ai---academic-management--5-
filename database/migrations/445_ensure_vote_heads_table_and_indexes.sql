-- Migration 445: Ensure vote_heads table, columns, indexes, and RLS policies exist
-- Prevents statement timeouts on vote_heads queries and guarantees sub-second tenant lookups.

DO $$
BEGIN
    -- 1. Create table if missing
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

    -- 2. Add missing columns safely if table already existed without them
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vote_heads' AND column_name = 'institution_id') THEN
        ALTER TABLE public.vote_heads ADD COLUMN institution_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vote_heads' AND column_name = 'allocated_amount') THEN
        ALTER TABLE public.vote_heads ADD COLUMN allocated_amount NUMERIC(15, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vote_heads' AND column_name = 'amount_spent') THEN
        ALTER TABLE public.vote_heads ADD COLUMN amount_spent NUMERIC(15, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vote_heads' AND column_name = 'academic_year_id') THEN
        ALTER TABLE public.vote_heads ADD COLUMN academic_year_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vote_heads' AND column_name = 'priority') THEN
        ALTER TABLE public.vote_heads ADD COLUMN priority INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vote_heads' AND column_name = 'is_percentage') THEN
        ALTER TABLE public.vote_heads ADD COLUMN is_percentage BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vote_heads' AND column_name = 'percentage') THEN
        ALTER TABLE public.vote_heads ADD COLUMN percentage DOUBLE PRECISION DEFAULT 0.0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vote_heads' AND column_name = 'created_at') THEN
        ALTER TABLE public.vote_heads ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vote_heads' AND column_name = 'updated_at') THEN
        ALTER TABLE public.vote_heads ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. High-performance composite and tenancy indexes
CREATE INDEX IF NOT EXISTS idx_vote_heads_institution_id ON public.vote_heads(institution_id);
CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_id ON public.vote_heads(institution_id, id);
CREATE INDEX IF NOT EXISTS idx_vote_heads_academic_year ON public.vote_heads(institution_id, academic_year_id);

-- 4. Enable RLS with permissive access policies for multi-tenant portal
ALTER TABLE public.vote_heads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'vote_heads' AND policyname = 'Allow select vote_heads'
    ) THEN
        CREATE POLICY "Allow select vote_heads" ON public.vote_heads
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'vote_heads' AND policyname = 'Allow insert vote_heads'
    ) THEN
        CREATE POLICY "Allow insert vote_heads" ON public.vote_heads
            FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'vote_heads' AND policyname = 'Allow update vote_heads'
    ) THEN
        CREATE POLICY "Allow update vote_heads" ON public.vote_heads
            FOR UPDATE USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'vote_heads' AND policyname = 'Allow delete vote_heads'
    ) THEN
        CREATE POLICY "Allow delete vote_heads" ON public.vote_heads
            FOR DELETE USING (true);
    END IF;
END $$;

GRANT ALL ON public.vote_heads TO anon, authenticated, service_role;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
