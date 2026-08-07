-- Migration 300: I&M Bank B2B/Business Connect API Integration
-- Purpose: Support I&M Bank Customer Validation & Payment Notification API for Tenants

-- 1. Add im_config column to institutions if not present
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS im_config JSONB DEFAULT '{
  "enabled": true,
  "apiKey": "",
  "callbackUser": "",
  "callbackSecret": "",
  "validationEndpoint": ""
}'::jsonb;

-- 2. Create im_bank_transactions table for idempotency, payment tracking & audit logs
CREATE TABLE IF NOT EXISTS public.im_bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_reference TEXT UNIQUE, -- Unique Payment Reference ID from I&M Bank (e.g., IMB202608070001)
    bill_number TEXT NOT NULL,
    customer_name TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    payment_channel TEXT DEFAULT 'I&M B2B', -- PESALINK, MPESA, EFT, RTGS, CASH
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'completed', -- 'validated', 'completed', 'duplicate', 'failed'
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_im_bank_tx_bank_ref ON public.im_bank_transactions(bank_reference);
CREATE INDEX IF NOT EXISTS idx_im_bank_tx_bill_num ON public.im_bank_transactions(bill_number);
CREATE INDEX IF NOT EXISTS idx_im_bank_tx_institution ON public.im_bank_transactions(institution_id);

-- 3. RPC Function for I&M Customer Validation (POST /im-validate/:institutionId or /validation)
CREATE OR REPLACE FUNCTION public.im_bank_validate(
    p_bill_number TEXT,
    p_institution_id TEXT DEFAULT NULL,
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
    v_matched_inst_id TEXT := NULL;
    v_clean_bill TEXT;
BEGIN
    v_clean_bill := TRIM(p_bill_number);

    -- 1. Search in users/students table (by admission number / student code / user_id / email)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        SELECT name, COALESCE(balance, fee_balance, 0), institution_id
        INTO v_customer_name, v_due_amount, v_matched_inst_id
        FROM public.users
        WHERE (LOWER(role) = 'student' OR role IS NULL)
          AND (
              LOWER(admission_number) = LOWER(v_clean_bill)
              OR LOWER(id::text) = LOWER(v_clean_bill)
              OR LOWER(email) = LOWER(v_clean_bill)
          )
          AND (p_institution_id IS NULL OR institution_id = p_institution_id)
        LIMIT 1;

        IF v_customer_name IS NOT NULL THEN
            v_found := TRUE;
        END IF;
    END IF;

    -- Search legacy/alternative students table if present
    IF NOT v_found AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        SELECT name, COALESCE(fee_balance, balance, 0), institution_id
        INTO v_customer_name, v_due_amount, v_matched_inst_id
        FROM public.students
        WHERE (
            LOWER(admission_number) = LOWER(v_clean_bill)
            OR LOWER(student_code) = LOWER(v_clean_bill)
            OR id::text = v_clean_bill
        )
        AND (p_institution_id IS NULL OR institution_id = p_institution_id)
        LIMIT 1;

        IF v_customer_name IS NOT NULL THEN
            v_found := TRUE;
        END IF;
    END IF;

    -- 2. If not found in students, search in invoices table by invoice_number
    IF NOT v_found AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        SELECT customer_name, COALESCE(balance_due, total_amount, 0), institution_id
        INTO v_customer_name, v_due_amount, v_matched_inst_id
        FROM public.invoices
        WHERE (
            LOWER(invoice_number) = LOWER(v_clean_bill)
            OR id::text = v_clean_bill
        )
        AND (p_institution_id IS NULL OR institution_id = p_institution_id)
        LIMIT 1;

        IF v_customer_name IS NOT NULL THEN
            v_found := TRUE;
        END IF;
    END IF;

    -- Fallback response formatting for I&M API specs
    IF v_found THEN
        RETURN jsonb_build_object(
            'found', TRUE,
            'statusCode', '00',
            'responseCode', '00',
            'customerName', v_customer_name,
            'billNumber', v_clean_bill,
            'amount', TRIM(TO_CHAR(COALESCE(v_due_amount, p_amount, 0), 'FM999999990.00')),
            'institutionId', COALESCE(v_matched_inst_id, p_institution_id),
            'message', 'Customer validated successfully',
            'description', 'Customer validated successfully'
        );
    ELSE
        RETURN jsonb_build_object(
            'found', FALSE,
            'statusCode', '01',
            'responseCode', '01',
            'customerName', NULL,
            'billNumber', v_clean_bill,
            'amount', '0.00',
            'institutionId', p_institution_id,
            'message', 'Customer account or bill reference not found',
            'description', 'Customer reference not found'
        );
    END IF;
END;
$$;

-- 4. RPC Function for I&M Payment Notification (POST /im-notify/:institutionId or /notification)
CREATE OR REPLACE FUNCTION public.im_bank_notify(
    p_bill_number TEXT,
    p_amount NUMERIC,
    p_bank_reference TEXT,
    p_institution_id TEXT DEFAULT NULL,
    p_payment_channel TEXT DEFAULT 'I&M B2B',
    p_transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_id UUID;
    v_customer_name TEXT := 'I&M Payment';
    v_target_inst_id TEXT := p_institution_id;
    v_receipt_number TEXT;
BEGIN
    -- Idempotency check on bank_reference
    SELECT id INTO v_existing_id
    FROM public.im_bank_transactions
    WHERE bank_reference = p_bank_reference
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'statusCode', '00',
            'responseCode', '00',
            'message', 'Transaction already processed (Idempotent success)',
            'bankReference', p_bank_reference
        );
    END IF;

    -- Lookup customer details and institution if missing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        SELECT name, institution_id INTO v_customer_name, v_target_inst_id
        FROM public.users
        WHERE LOWER(admission_number) = LOWER(TRIM(p_bill_number))
           OR id::text = TRIM(p_bill_number)
        LIMIT 1;
    END IF;

    IF v_target_inst_id IS NULL THEN
        v_target_inst_id := p_institution_id;
    END IF;

    v_receipt_number := 'REC-IMB-' || SUBSTRING(MD5(p_bank_reference || RANDOM()::text) FROM 1 FOR 8);

    -- Log transaction in im_bank_transactions
    INSERT INTO public.im_bank_transactions (
        bank_reference,
        bill_number,
        customer_name,
        amount,
        payment_channel,
        transaction_date,
        status,
        institution_id,
        raw_payload
    ) VALUES (
        p_bank_reference,
        p_bill_number,
        COALESCE(p_raw_payload->>'customerName', v_customer_name),
        p_amount,
        COALESCE(p_payment_channel, 'I&M B2B'),
        COALESCE(p_transaction_date, CURRENT_TIMESTAMP),
        'completed',
        v_target_inst_id,
        p_raw_payload
    );

    RETURN jsonb_build_object(
        'statusCode', '00',
        'responseCode', '00',
        'message', 'Payment notification recorded successfully',
        'bankReference', p_bank_reference,
        'receiptNumber', v_receipt_number,
        'institutionId', v_target_inst_id
    );
END;
$$;
