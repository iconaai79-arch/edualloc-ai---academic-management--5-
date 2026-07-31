-- Migration 297: Equity Bank Biller API Integration
-- Purpose: Support Equity Bank Biller Customer Validation & Notification API

-- 1. Add equity_biller_config to institutions
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS equity_biller_config JSONB DEFAULT '{
  "enabled": true,
  "username": "equity_biller_user",
  "secret_key": "equity_biller_jwt_secret_key_change_me",
  "require_exact_amount": false
}'::jsonb;

-- 2. Create equity_biller_transactions table for idempotency and audit logs
CREATE TABLE IF NOT EXISTS public.equity_biller_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_reference TEXT UNIQUE, -- Unique Transaction ID from Equity (e.g. EQB293293829)
    bill_number TEXT NOT NULL,
    customer_name TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'completed', -- 'validated', 'completed', 'duplicate', 'failed'
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_equity_biller_tx_bank_ref ON public.equity_biller_transactions(bank_reference);
CREATE INDEX IF NOT EXISTS idx_equity_biller_tx_bill_num ON public.equity_biller_transactions(bill_number);
CREATE INDEX IF NOT EXISTS idx_equity_biller_tx_institution ON public.equity_biller_transactions(institution_id);

-- 3. RPC Function for Biller Validation (POST /validation)
CREATE OR REPLACE FUNCTION public.equity_biller_validate(
    p_bill_number TEXT,
    p_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_name TEXT := NULL;
    v_due_amount NUMERIC := 0;
    v_found BOOLEAN := FALSE;
    v_student_rec RECORD;
    v_invoice_rec RECORD;
BEGIN
    -- Trim bill number
    p_bill_number := TRIM(p_bill_number);

    -- Search in students table (by admission number / student code / id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        SELECT name, COALESCE(fee_balance, balance, 0)
        INTO v_customer_name, v_due_amount
        FROM public.students
        WHERE LOWER(admission_number) = LOWER(p_bill_number)
           OR LOWER(student_code) = LOWER(p_bill_number)
           OR id::text = p_bill_number
        LIMIT 1;

        IF v_customer_name IS NOT NULL THEN
            v_found := TRUE;
        END IF;
    END IF;

    -- If not found in students, search in invoices table
    IF NOT v_found AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        SELECT customer_name, balance_due
        INTO v_customer_name, v_due_amount
        FROM public.invoices
        WHERE LOWER(invoice_number) = LOWER(p_bill_number)
           OR id::text = p_bill_number
        LIMIT 1;

        IF v_customer_name IS NOT NULL THEN
            v_found := TRUE;
        END IF;
    END IF;

    -- Fallback generic customer lookup if still not found
    IF NOT v_found THEN
        v_customer_name := 'Valued Customer (' || p_bill_number || ')';
        v_due_amount := COALESCE(p_amount, 0);
    END IF;

    RETURN jsonb_build_object(
        'found', v_found,
        'customerName', COALESCE(v_customer_name, 'Valued Customer'),
        'billNumber', p_bill_number,
        'amount', TRIM(TO_CHAR(COALESCE(v_due_amount, p_amount, 0), 'FM999999990.00')),
        'description', CASE WHEN v_found THEN 'Success' ELSE 'Customer validated successfully' END
    );
END;
$$;

-- 4. RPC Function for Biller Notification (POST /notification)
CREATE OR REPLACE FUNCTION public.equity_biller_notify(
    p_bill_number TEXT,
    p_amount NUMERIC,
    p_bank_reference TEXT,
    p_transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
    v_student_id TEXT := NULL;
    v_institution_id TEXT := NULL;
BEGIN
    -- Check for duplicate bank_reference (Idempotency)
    SELECT id INTO v_existing_id
    FROM public.equity_biller_transactions
    WHERE bank_reference = p_bank_reference
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'responseCode', '400',
            'responseMessage', 'Duplicate transaction'
        );
    END IF;

    -- Lookup student/institution mapping if student exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        SELECT id::text, institution_id INTO v_student_id, v_institution_id
        FROM public.students
        WHERE LOWER(admission_number) = LOWER(TRIM(p_bill_number))
           OR LOWER(student_code) = LOWER(TRIM(p_bill_number))
           OR id::text = TRIM(p_bill_number)
        LIMIT 1;
    END IF;

    -- Log transaction
    INSERT INTO public.equity_biller_transactions (
        bank_reference,
        bill_number,
        customer_name,
        amount,
        transaction_date,
        status,
        institution_id,
        raw_payload
    ) VALUES (
        p_bank_reference,
        p_bill_number,
        COALESCE(p_raw_payload->>'customerName', 'Equity Payment'),
        p_amount,
        COALESCE(p_transaction_date, CURRENT_TIMESTAMP),
        'completed',
        v_institution_id,
        p_raw_payload
    );

    -- Log into general integration_logs table if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integration_logs') THEN
        INSERT INTO public.integration_logs (provider, payload, created_at)
        VALUES ('equity_biller', p_raw_payload, CURRENT_TIMESTAMP);
    END IF;

    -- Record into bank_transactions table if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bank_transactions') THEN
        INSERT INTO public.bank_transactions (
            id,
            transaction_type,
            amount,
            status,
            reference_number,
            institution_id,
            payload,
            created_at
        ) VALUES (
            p_bank_reference,
            'EQUITY_BILLER_CREDIT',
            p_amount,
            'completed',
            p_bill_number,
            v_institution_id,
            p_raw_payload,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'responseCode', '200',
        'responseMessage', 'Success'
    );
END;
$$;
