-- Migration 343: Ensure mpesa_transactions and integration_logs tables exist with full column schemas and TEXT IDs
-- Description: Creates mpesa_transactions and integration_logs tables, handles type migrations, indexes, RLS, and reloads PostgREST schema cache.

-- 1. Ensure mpesa_transactions table exists
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
    id TEXT PRIMARY KEY,
    transaction_id TEXT,
    checkout_request_id TEXT,
    institution_id TEXT,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    phone_number TEXT,
    payer_name TEXT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    provider TEXT DEFAULT 'safaricom',
    request_id TEXT,
    channel_code TEXT,
    currency TEXT DEFAULT 'KES',
    customer_reference TEXT,
    customer_name TEXT,
    customer_mobile_number TEXT,
    balance NUMERIC(15, 2),
    narration TEXT,
    credit_account_identifier TEXT,
    till_number TEXT,
    bill_ref_number TEXT,
    third_party_trans_id TEXT,
    msisdn TEXT,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    org_account_balance NUMERIC(15, 2),
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all columns exist on mpesa_transactions if table was pre-existing
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS payer_name TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'safaricom';
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS request_id TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS channel_code TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES';
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS customer_reference TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS customer_mobile_number TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS balance NUMERIC(15, 2);
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS narration TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS credit_account_identifier TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS till_number TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS bill_ref_number TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS third_party_trans_id TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS msisdn TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS org_account_balance NUMERIC(15, 2);
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS raw_payload JSONB;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 2. Ensure integration_logs table exists
CREATE TABLE IF NOT EXISTS public.integration_logs (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    provider TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT,
    error_message TEXT,
    endpoint TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.integration_logs ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.integration_logs ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.integration_logs ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.integration_logs ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.integration_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.integration_logs ADD COLUMN IF NOT EXISTS endpoint TEXT;
ALTER TABLE public.integration_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.integration_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 3. Safely convert UUID columns to TEXT if legacy tables had UUID columns
DO $$ 
BEGIN
    -- mpesa_transactions
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'mpesa_transactions' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.mpesa_transactions ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'mpesa_transactions' AND column_name = 'institution_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.mpesa_transactions ALTER COLUMN institution_id TYPE TEXT USING institution_id::TEXT;
    END IF;

    -- integration_logs
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'integration_logs' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.integration_logs ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'integration_logs' AND column_name = 'institution_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.integration_logs ALTER COLUMN institution_id TYPE TEXT USING institution_id::TEXT;
    END IF;
END $$;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_institution ON public.mpesa_transactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_transaction_id ON public.mpesa_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_checkout ON public.mpesa_transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_phone ON public.mpesa_transactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_status ON public.mpesa_transactions(status);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_provider ON public.mpesa_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_mpesa_tx_timestamp ON public.mpesa_transactions(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_integration_logs_inst ON public.integration_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_provider ON public.integration_logs(provider);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created ON public.integration_logs(created_at DESC);

-- 5. Row Level Security & Permissive Policies
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mpesa_transactions_all_access" ON public.mpesa_transactions;
CREATE POLICY "mpesa_transactions_all_access" ON public.mpesa_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "integration_logs_all_access" ON public.integration_logs;
CREATE POLICY "integration_logs_all_access" ON public.integration_logs FOR ALL USING (true) WITH CHECK (true);

-- 6. Permissions
GRANT ALL ON public.mpesa_transactions TO anon, authenticated, service_role;
GRANT ALL ON public.integration_logs TO anon, authenticated, service_role;

-- 7. Reload schema cache
NOTIFY pgrst, 'reload schema';
