-- Migration 333: Ensure payment gateway transactions tables
-- Description: Creates airtel_transactions, intasend_transactions, and ncba_transactions tables with indexes, RLS, and PostgREST reload.

-- 1. Airtel Money Transactions
CREATE TABLE IF NOT EXISTS public.airtel_transactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    receipt_no TEXT,
    phone_number TEXT,
    account_reference TEXT,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Completed',
    raw_payload JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all columns exist on airtel_transactions
ALTER TABLE public.airtel_transactions ADD COLUMN IF NOT EXISTS receipt_no TEXT;
ALTER TABLE public.airtel_transactions ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.airtel_transactions ADD COLUMN IF NOT EXISTS account_reference TEXT;
ALTER TABLE public.airtel_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.airtel_transactions ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.airtel_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Completed';
ALTER TABLE public.airtel_transactions ADD COLUMN IF NOT EXISTS raw_payload JSONB;
ALTER TABLE public.airtel_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.airtel_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.airtel_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 2. IntaSend Transactions
CREATE TABLE IF NOT EXISTS public.intasend_transactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    tracking_id TEXT,
    phone_number TEXT,
    email TEXT,
    account_reference TEXT,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Completed',
    raw_payload JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all columns exist on intasend_transactions
ALTER TABLE public.intasend_transactions ADD COLUMN IF NOT EXISTS tracking_id TEXT;
ALTER TABLE public.intasend_transactions ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.intasend_transactions ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.intasend_transactions ADD COLUMN IF NOT EXISTS account_reference TEXT;
ALTER TABLE public.intasend_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.intasend_transactions ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.intasend_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Completed';
ALTER TABLE public.intasend_transactions ADD COLUMN IF NOT EXISTS raw_payload JSONB;
ALTER TABLE public.intasend_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.intasend_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.intasend_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 3. NCBA Bank Transactions
CREATE TABLE IF NOT EXISTS public.ncba_transactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    reference_no TEXT,
    account_number TEXT,
    customer_name TEXT,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Completed',
    raw_payload JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all columns exist on ncba_transactions (handles pre-existing tables)
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS reference_no TEXT;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Completed';
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS raw_payload JSONB;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'ncba';
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS payer_name TEXT;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS external_data JSONB DEFAULT '{}';
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.ncba_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Backfill reference_no if null from legacy columns
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ncba_transactions' 
          AND column_name = 'reference_no'
    ) THEN
        UPDATE public.ncba_transactions 
        SET reference_no = COALESCE(reference_no, transaction_id, reference_id, receipt_number, id) 
        WHERE reference_no IS NULL;
    END IF;
END $$;

-- Ensure text types if previously created with UUIDs
DO $$ 
BEGIN
    -- airtel_transactions
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'airtel_transactions' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.airtel_transactions ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'airtel_transactions' 
          AND column_name = 'institution_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.airtel_transactions ALTER COLUMN institution_id TYPE TEXT USING institution_id::TEXT;
    END IF;

    -- intasend_transactions
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'intasend_transactions' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.intasend_transactions ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'intasend_transactions' 
          AND column_name = 'institution_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.intasend_transactions ALTER COLUMN institution_id TYPE TEXT USING institution_id::TEXT;
    END IF;

    -- ncba_transactions
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ncba_transactions' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.ncba_transactions ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ncba_transactions' 
          AND column_name = 'institution_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.ncba_transactions ALTER COLUMN institution_id TYPE TEXT USING institution_id::TEXT;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_airtel_tx_inst ON public.airtel_transactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_airtel_tx_receipt ON public.airtel_transactions(receipt_no);
CREATE INDEX IF NOT EXISTS idx_airtel_tx_date ON public.airtel_transactions(transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_intasend_tx_inst ON public.intasend_transactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_intasend_tx_tracking ON public.intasend_transactions(tracking_id);
CREATE INDEX IF NOT EXISTS idx_intasend_tx_date ON public.intasend_transactions(transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_ncba_tx_inst ON public.ncba_transactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_ncba_tx_ref ON public.ncba_transactions(reference_no);
CREATE INDEX IF NOT EXISTS idx_ncba_tx_date ON public.ncba_transactions(transaction_date DESC);

-- Enable RLS
ALTER TABLE public.airtel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intasend_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ncba_transactions ENABLE ROW LEVEL SECURITY;

-- Scoped Institutional Tenancy RLS Policies
DO $$
DECLARE
    t text;
    tables text[] := ARRAY['airtel_transactions', 'intasend_transactions', 'ncba_transactions'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_all_access" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy insert: %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy update: %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy delete: %s" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "Institutional tenancy select: %s" ON public.%I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy insert: %s" ON public.%I FOR INSERT WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy update: %s" ON public.%I FOR UPDATE USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL) WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy delete: %s" ON public.%I FOR DELETE USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
    END LOOP;
END $$;

-- Grant privileges
GRANT ALL ON public.airtel_transactions TO anon, authenticated, service_role;
GRANT ALL ON public.intasend_transactions TO anon, authenticated, service_role;
GRANT ALL ON public.ncba_transactions TO anon, authenticated, service_role;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
