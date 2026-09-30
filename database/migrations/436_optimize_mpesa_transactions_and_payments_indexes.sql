-- Migration 436: Optimize M-Pesa, Bank, and Gateway Transaction Indexes for High-Offset Pagination
-- Description: Adds composite B-tree indexes on (created_at DESC, id DESC) and (institution_id, created_at DESC)
-- to prevent statement timeouts (Postgres 57014) on large offsets (OFFSET 3000+) during bulk data synchronization.

DO $$
BEGIN
    -- 1. mpesa_transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mpesa_transactions') THEN
        CREATE INDEX IF NOT EXISTS idx_mpesa_tx_created_at ON public.mpesa_transactions(created_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_mpesa_tx_inst_created_at ON public.mpesa_transactions(institution_id, created_at DESC);
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mpesa_transactions' AND column_name = 'updated_at') THEN
            CREATE INDEX IF NOT EXISTS idx_mpesa_tx_updated_at ON public.mpesa_transactions(updated_at DESC);
        END IF;
    END IF;

    -- 2. bank_transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bank_transactions') THEN
        CREATE INDEX IF NOT EXISTS idx_bank_tx_created_at ON public.bank_transactions(created_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_bank_tx_inst_created_at ON public.bank_transactions(institution_id, created_at DESC);
    END IF;

    -- 3. airtel_transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'airtel_transactions') THEN
        CREATE INDEX IF NOT EXISTS idx_airtel_tx_created_at ON public.airtel_transactions(created_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_airtel_tx_inst_created_at ON public.airtel_transactions(institution_id, created_at DESC);
    END IF;

    -- 4. intasend_transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'intasend_transactions') THEN
        CREATE INDEX IF NOT EXISTS idx_intasend_tx_created_at ON public.intasend_transactions(created_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_intasend_tx_inst_created_at ON public.intasend_transactions(institution_id, created_at DESC);
    END IF;

    -- 5. ncba_transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ncba_transactions') THEN
        CREATE INDEX IF NOT EXISTS idx_ncba_tx_created_at ON public.ncba_transactions(created_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_ncba_tx_inst_created_at ON public.ncba_transactions(institution_id, created_at DESC);
    END IF;

    -- 6. integration_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integration_logs') THEN
        CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at_id ON public.integration_logs(created_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_integration_logs_inst_created_at ON public.integration_logs(institution_id, created_at DESC);
    END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
