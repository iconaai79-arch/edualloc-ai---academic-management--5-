-- Migration 408: Add indexes for ncba_transactions and receipts tables to prevent statement timeouts
-- Purpose: Accelerate queries on ncba_transactions (created_at DESC) and receipts (institution_id, payment_date DESC)

DO $$
BEGIN
    -- 1. Optimize ncba_transactions indexing
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ncba_transactions'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_ncba_tx_created_at ON public.ncba_transactions(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_ncba_tx_inst_created ON public.ncba_transactions(institution_id, created_at DESC);
    END IF;

    -- 2. Optimize receipts indexing
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'receipts'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_receipts_inst_id ON public.receipts(institution_id);
        CREATE INDEX IF NOT EXISTS idx_receipts_payment_date ON public.receipts(payment_date DESC);
        CREATE INDEX IF NOT EXISTS idx_receipts_inst_payment_date ON public.receipts(institution_id, payment_date DESC);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
