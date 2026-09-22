-- Migration 413: Add composite indexes for receipts table to eliminate statement timeouts
-- Purpose: Accelerate queries on receipts filtering by institution_id, and ordering by payment_date, created_at, or id

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'receipts'
    ) THEN
        -- 1. Index for tenancy filtering
        CREATE INDEX IF NOT EXISTS idx_receipts_inst_id ON public.receipts(institution_id);

        -- 2. Composite indexes for institution_id + ordering/pagination
        CREATE INDEX IF NOT EXISTS idx_receipts_inst_payment_date ON public.receipts(institution_id, payment_date DESC);
        CREATE INDEX IF NOT EXISTS idx_receipts_inst_id_composite ON public.receipts(institution_id, id DESC);

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'created_at'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_receipts_inst_created ON public.receipts(institution_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON public.receipts(created_at DESC);
        END IF;

        -- 3. Composite indexes for student lookup within an institution
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'student_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_receipts_inst_student ON public.receipts(institution_id, student_id);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'admission_number'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_receipts_inst_adm ON public.receipts(institution_id, admission_number);
        END IF;

        -- 4. Global single-column index for payment_date sorting
        CREATE INDEX IF NOT EXISTS idx_receipts_payment_date ON public.receipts(payment_date DESC);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
