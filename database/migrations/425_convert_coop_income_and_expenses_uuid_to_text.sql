-- Migration 425: Convert coop_income and coop_expenses columns from UUID to TEXT
-- Description: Resolves "invalid input syntax for type uuid" error (22P02) when querying
-- coop_income or coop_expenses with string institution IDs or client-generated string IDs.
-- Standardizes all primary keys and foreign keys to TEXT to match EduAI architecture.

-- 1. Ensure coop_expenses table exists with TEXT identifiers
CREATE TABLE IF NOT EXISTS public.coop_expenses (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'General Operating',
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by TEXT,
    farmer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ensure coop_income table exists with TEXT identifiers
CREATE TABLE IF NOT EXISTS public.coop_income (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    company_name TEXT NOT NULL DEFAULT '',
    product_type TEXT NOT NULL DEFAULT 'milk',
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit TEXT NOT NULL DEFAULT 'kgs',
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Dynamically drop any restrictive foreign keys on institution_id or farmer_id that block type alteration
DO $$
DECLARE
    r RECORD;
    t TEXT;
    tables TEXT[] := ARRAY['coop_income', 'coop_expenses'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        FOR r IN (
            SELECT conname
            FROM pg_constraint
            WHERE conrelid::regclass::text IN (t, 'public.' || t)
              AND contype = 'f'
        ) LOOP
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I CASCADE;', t, r.conname);
            RAISE NOTICE 'Dropped foreign key % on table %', r.conname, t;
        END LOOP;
    END LOOP;
END $$;

-- 4. CRITICAL: Dynamically drop ALL RLS policies on coop_income and coop_expenses BEFORE altering column types!
-- PostgreSQL raises error 0A000 ("cannot alter type of a column used in a policy definition")
-- if an RLS policy references a column whose data type is being altered.
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('coop_income', 'coop_expenses')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE;', pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
    END LOOP;
END $$;

-- 5. Drop existing indexes that might depend on column types before alteration
DROP INDEX IF EXISTS public.idx_coop_income_inst;
DROP INDEX IF EXISTS public.idx_coop_income_date;
DROP INDEX IF EXISTS public.idx_coop_expenses_inst;
DROP INDEX IF EXISTS public.idx_coop_expenses_date;
DROP INDEX IF EXISTS public.idx_coop_expenses_farmer;

-- 6. Drop UUID-based defaults if present (e.g. uuid_generate_v4() or gen_random_uuid())
ALTER TABLE IF EXISTS public.coop_income ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.coop_expenses ALTER COLUMN id DROP DEFAULT;

-- 7. Convert any columns of type UUID to TEXT
DO $$ 
DECLARE
    col RECORD;
BEGIN
    FOR col IN 
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name IN ('coop_income', 'coop_expenses') 
          AND data_type = 'uuid'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE TEXT USING %I::TEXT;', col.table_name, col.column_name, col.column_name);
        RAISE NOTICE 'Converted column %.% from UUID to TEXT', col.table_name, col.column_name;
    END LOOP;
END $$;

-- 8. Ensure all required columns exist with proper TEXT types
DO $$
BEGIN
    -- coop_income columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coop_income' AND column_name = 'company_name') THEN
        ALTER TABLE public.coop_income ADD COLUMN company_name TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coop_income' AND column_name = 'product_type') THEN
        ALTER TABLE public.coop_income ADD COLUMN product_type TEXT NOT NULL DEFAULT 'milk';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coop_income' AND column_name = 'quantity') THEN
        ALTER TABLE public.coop_income ADD COLUMN quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coop_income' AND column_name = 'unit') THEN
        ALTER TABLE public.coop_income ADD COLUMN unit TEXT NOT NULL DEFAULT 'kgs';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coop_income' AND column_name = 'amount') THEN
        ALTER TABLE public.coop_income ADD COLUMN amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coop_income' AND column_name = 'date') THEN
        ALTER TABLE public.coop_income ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coop_income' AND column_name = 'recorded_by') THEN
        ALTER TABLE public.coop_income ADD COLUMN recorded_by TEXT;
    END IF;

    -- coop_expenses columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coop_expenses' AND column_name = 'description') THEN
        ALTER TABLE public.coop_expenses ADD COLUMN description TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coop_expenses' AND column_name = 'category') THEN
        ALTER TABLE public.coop_expenses ADD COLUMN category TEXT NOT NULL DEFAULT 'General Operating';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coop_expenses' AND column_name = 'amount') THEN
        ALTER TABLE public.coop_expenses ADD COLUMN amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coop_expenses' AND column_name = 'date') THEN
        ALTER TABLE public.coop_expenses ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coop_expenses' AND column_name = 'recorded_by') THEN
        ALTER TABLE public.coop_expenses ADD COLUMN recorded_by TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'coop_expenses' AND column_name = 'farmer_id') THEN
        ALTER TABLE public.coop_expenses ADD COLUMN farmer_id TEXT;
    END IF;
END $$;

-- 9. Recreate performance indexes with TEXT support
CREATE INDEX IF NOT EXISTS idx_coop_income_inst ON public.coop_income(institution_id);
CREATE INDEX IF NOT EXISTS idx_coop_income_date ON public.coop_income(date DESC);
CREATE INDEX IF NOT EXISTS idx_coop_expenses_inst ON public.coop_expenses(institution_id);
CREATE INDEX IF NOT EXISTS idx_coop_expenses_date ON public.coop_expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_coop_expenses_farmer ON public.coop_expenses(farmer_id);

-- 10. Enable Row Level Security
ALTER TABLE public.coop_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coop_expenses ENABLE ROW LEVEL SECURITY;

-- 11. Recreate fresh scoped multi-tenant RLS policies
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['coop_expenses', 'coop_income'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL) WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;

-- 12. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
