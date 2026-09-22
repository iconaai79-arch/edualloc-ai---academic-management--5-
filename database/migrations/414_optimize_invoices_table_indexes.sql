-- Migration 414: Add composite indexes for invoices table to eliminate statement timeouts
-- Purpose: Accelerate queries on invoices filtering by institution_id, and ordering by created_at, due_date, issue_date, or id

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'invoices'
    ) THEN
        -- 1. Tenancy index
        CREATE INDEX IF NOT EXISTS idx_invoices_inst_id ON public.invoices(institution_id);

        -- 2. Composite indexes for institution_id + ordering/pagination
        CREATE INDEX IF NOT EXISTS idx_invoices_inst_id_composite ON public.invoices(institution_id, id DESC);

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'created_at'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_invoices_inst_created ON public.invoices(institution_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'due_date'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_invoices_inst_due_date ON public.invoices(institution_id, due_date DESC);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'issue_date'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_invoices_inst_issue_date ON public.invoices(institution_id, issue_date DESC);
        END IF;

        -- 3. Composite indexes for status and student lookup within an institution
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'status'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_invoices_inst_status ON public.invoices(institution_id, status);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'student_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_invoices_inst_student ON public.invoices(institution_id, student_id);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'class_name'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_invoices_inst_class ON public.invoices(institution_id, class_name);
        END IF;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
