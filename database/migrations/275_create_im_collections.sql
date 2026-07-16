-- Migration 275: Create I&M Collections API Tables

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='institutions' AND column_name='im_config') THEN
        ALTER TABLE public.institutions ADD COLUMN im_config JSONB;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.im_transactions (
    id TEXT PRIMARY KEY,
    transaction_reference TEXT UNIQUE NOT NULL, -- transactionReference
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    payment_type TEXT NOT NULL, -- paymentType
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    short_code TEXT NOT NULL,
    customer_ref TEXT,
    external_ref_number TEXT,
    payer_name TEXT,
    payer_mobile_number TEXT,
    sender_bank_code TEXT,
    sender_account_number TEXT,
    sender_account_name TEXT,
    cheque_number TEXT,
    status TEXT NOT NULL DEFAULT 'completed', -- completed, failed
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_im_txn_status ON public.im_transactions(status);
CREATE INDEX IF NOT EXISTS idx_im_txn_institution ON public.im_transactions(institution_id);
