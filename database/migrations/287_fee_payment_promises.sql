-- Migration: 287_fee_payment_promises.sql
-- Create table for tracking parent Promise to Pay (PTP) commitments

CREATE TABLE IF NOT EXISTS public.fee_promises (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    student_name TEXT,
    admission_number TEXT,
    class_name TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    promised_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    promised_date DATE NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'partially_fulfilled', 'overdue', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.fee_promises ENABLE ROW LEVEL SECURITY;

-- Permissive policies for institution operations
CREATE POLICY "Allow authenticated read fee_promises" ON public.fee_promises
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert fee_promises" ON public.fee_promises
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update fee_promises" ON public.fee_promises
    FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated delete fee_promises" ON public.fee_promises
    FOR DELETE USING (true);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_fee_promises_institution ON public.fee_promises(institution_id);
CREATE INDEX IF NOT EXISTS idx_fee_promises_student ON public.fee_promises(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_promises_date ON public.fee_promises(promised_date);
CREATE INDEX IF NOT EXISTS idx_fee_promises_status ON public.fee_promises(status);
