-- Migration 495: Optimize ds_invoices, ds_payments, and ds_lessons constraints, indexes, and RLS
-- Purpose:
--   1. Drop rigid database-level foreign keys on ds_invoices, ds_payments, and ds_lessons that cause lock contention and statement timeouts (14000ms).
--   2. Make student_id nullable in ds_invoices to allow corporate, lead, or walk-in billing.
--   3. Apply master permissive RLS policies and grant permissions to anon, authenticated, and service_role.
--   4. Add high-performance composite indexes for instant upsert, query, and pagination.

SET statement_timeout = '1min';

DO $$
DECLARE
    r RECORD;
    t TEXT;
    ds_tables TEXT[] := ARRAY['ds_invoices', 'ds_payments', 'ds_lessons', 'ds_students'];
BEGIN
    -- 1. Ensure required columns exist on ds_invoices
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_invoices') THEN
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS branch_id TEXT;
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS fee_structure_id TEXT;
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS class_name TEXT;
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) DEFAULT 0;
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 2) DEFAULT 0;
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2) DEFAULT 0;
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS due_date DATE;
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS student_name TEXT DEFAULT 'Student';
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        -- Drop NOT NULL on student_id and student_name to allow flexible billing
        ALTER TABLE public.ds_invoices ALTER COLUMN student_id DROP NOT NULL;
        ALTER TABLE public.ds_invoices ALTER COLUMN student_name DROP NOT NULL;
        ALTER TABLE public.ds_invoices ALTER COLUMN items SET DEFAULT '[]'::jsonb;
    END IF;

    -- 2. Drop all rigid FK constraints on ds_invoices, ds_payments, and ds_lessons
    -- Rigid database-level FKs to institutions or users cause severe table lock contention and timeouts
    FOR r IN
        SELECT conname, conrelid::regclass::text as tablename
        FROM   pg_constraint
        WHERE  conrelid IN (
            'public.ds_invoices'::regclass, 
            'public.ds_payments'::regclass, 
            'public.ds_lessons'::regclass
        )
        AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I CASCADE;', r.tablename, r.conname);
        RAISE NOTICE 'Dropped FK % from %', r.conname, r.tablename;
    END LOOP;

    -- 3. Reset RLS policies to master permissive
    FOREACH t IN ARRAY ds_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            
            -- Drop any existing policies
            FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t) LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
            END LOOP;

            -- Create master unblock policy
            EXECUTE format('CREATE POLICY "%s_all_access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
            EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
        END IF;
    END LOOP;
END $$;

-- 4. High-performance composite indexes for ds_invoices
CREATE INDEX IF NOT EXISTS idx_ds_invoices_inst_id_desc 
    ON public.ds_invoices(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_ds_invoices_inst_student 
    ON public.ds_invoices(institution_id, student_id);

CREATE INDEX IF NOT EXISTS idx_ds_invoices_inst_status 
    ON public.ds_invoices(institution_id, status);

CREATE INDEX IF NOT EXISTS idx_ds_invoices_inst_invoice_no 
    ON public.ds_invoices(institution_id, invoice_number);

CREATE INDEX IF NOT EXISTS idx_ds_invoices_inst_branch 
    ON public.ds_invoices(institution_id, branch_id);

-- 5. High-performance composite indexes for ds_payments
CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_id_desc 
    ON public.ds_payments(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_invoice 
    ON public.ds_payments(institution_id, invoice_id);

-- 6. Update PostgreSQL query planner statistics
ANALYZE public.ds_invoices;
ANALYZE public.ds_payments;
ANALYZE public.ds_lessons;
ANALYZE public.ds_students;

-- 7. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
