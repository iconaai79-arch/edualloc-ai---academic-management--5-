-- Migration 437: Create School and Teacher E-Wallets with Super Admin Convenience Fee Engine
-- Establishes:
-- 1. Pre-funded Institutional Float Wallets (institution_wallets)
-- 2. Teacher Earnings E-Wallets (teacher_wallets)
-- 3. Super Admin Platform Revenue Wallet (super_admin_revenue_wallets)
-- 4. Dynamic Platform Convenience Fee Configs (convenience_fee_configs)
-- 5. Immutable Double-Entry Ledger (wallet_transactions)
-- 6. Concurrency-Safe RPC Stored Procedures with Row-Level Locking (SELECT FOR UPDATE)

-- ============================================================================
-- 1. INSTITUTION WALLETS (Pre-Funded School Float)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.institution_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL DEFAULT 'KES',
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (current_balance >= 0),
    reserved_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (reserved_balance >= 0),
    low_float_threshold NUMERIC(15, 2) NOT NULL DEFAULT 10000.00 CHECK (low_float_threshold >= 0),
    auto_topup_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    lock_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_institution_wallets_institution UNIQUE(institution_id)
);

-- ============================================================================
-- 2. TEACHER WALLETS (Teacher Earnings & On-Demand M-Pesa Withdrawals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teacher_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL DEFAULT 'KES',
    available_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
    pending_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0),
    total_withdrawn NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_withdrawn >= 0),
    total_earned NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_earned >= 0),
    mpesa_phone_number VARCHAR(20),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    lock_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_teacher_wallets_teacher_inst UNIQUE(teacher_id, institution_id)
);

-- ============================================================================
-- 3. SUPER ADMIN REVENUE WALLETS (Platform Convenience Fees)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.super_admin_revenue_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency VARCHAR(10) NOT NULL DEFAULT 'KES',
    total_fees_collected NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_fees_collected >= 0),
    available_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
    total_withdrawn NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_withdrawn >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default platform revenue wallet if not exists
INSERT INTO public.super_admin_revenue_wallets (currency, total_fees_collected, available_balance, total_withdrawn)
SELECT 'KES', 0.00, 0.00, 0.00
WHERE NOT EXISTS (SELECT 1 FROM public.super_admin_revenue_wallets);

-- ============================================================================
-- 4. CONVENIENCE FEE CONFIGURATIONS (Monetization Engine)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.convenience_fee_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL DEFAULT 'Standard Platform Payout Fee',
    fee_type VARCHAR(20) NOT NULL DEFAULT 'HYBRID' CHECK (fee_type IN ('FIXED', 'PERCENTAGE', 'HYBRID', 'FREE')),
    fixed_amount NUMERIC(10, 2) NOT NULL DEFAULT 15.00 CHECK (fixed_amount >= 0),
    percentage_rate NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (percentage_rate >= 0 AND percentage_rate <= 100),
    min_fee NUMERIC(10, 2) NOT NULL DEFAULT 10.00 CHECK (min_fee >= 0),
    max_fee NUMERIC(10, 2) NOT NULL DEFAULT 100.00 CHECK (max_fee >= 0),
    fee_bearer VARCHAR(20) NOT NULL DEFAULT 'TEACHER' CHECK (fee_bearer IN ('TEACHER', 'SCHOOL', 'SPLIT')),
    applies_to VARCHAR(50) NOT NULL DEFAULT 'TEACHER_WITHDRAWAL' CHECK (applies_to IN ('TEACHER_WITHDRAWAL', 'REMEDIAL_PAYOUT', 'FLOAT_TOPUP', 'ALL_PAYOUTS')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT DEFAULT 'Convenience fee applied during teacher wallet cash-out to M-Pesa.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default convenience fee rule if none exist
INSERT INTO public.convenience_fee_configs (name, fee_type, fixed_amount, percentage_rate, min_fee, max_fee, fee_bearer, applies_to, is_active, description)
SELECT 
    'Standard M-Pesa Cash-out Convenience Fee',
    'HYBRID',
    10.00,
    1.00,
    10.00,
    75.00,
    'TEACHER',
    'TEACHER_WITHDRAWAL',
    TRUE,
    'Fixed KES 10 + 1% platform fee (capped at KES 75) borne by teacher on self-service M-Pesa cashout.'
WHERE NOT EXISTS (SELECT 1 FROM public.convenience_fee_configs);

-- ============================================================================
-- 5. IMMUTABLE WALLET TRANSACTIONS (Double-Entry Ledger)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    wallet_type VARCHAR(20) NOT NULL CHECK (wallet_type IN ('INSTITUTION', 'TEACHER', 'SUPER_ADMIN')),
    institution_wallet_id UUID REFERENCES public.institution_wallets(id) ON DELETE SET NULL,
    teacher_wallet_id UUID REFERENCES public.teacher_wallets(id) ON DELETE SET NULL,
    teacher_id TEXT,
    transaction_category VARCHAR(50) NOT NULL CHECK (transaction_category IN (
        'FLOAT_TOPUP', 
        'EARNING_CREDIT', 
        'TEACHER_WITHDRAWAL', 
        'CONVENIENCE_FEE', 
        'INTERNAL_TRANSFER',
        'REVERSAL', 
        'ADJUSTMENT'
    )),
    flow_type VARCHAR(10) NOT NULL CHECK (flow_type IN ('CREDIT', 'DEBIT')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    convenience_fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (convenience_fee >= 0),
    net_amount NUMERIC(15, 2) NOT NULL CHECK (net_amount >= 0),
    balance_before NUMERIC(15, 2) NOT NULL,
    balance_after NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'KES',
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED')),
    external_reference VARCHAR(100),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'MPESA',
    phone_number VARCHAR(20),
    related_payout_id VARCHAR(100),
    related_session_ids TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance & Reporting Indexes
CREATE INDEX IF NOT EXISTS idx_inst_wallets_inst_id ON public.institution_wallets(institution_id);
CREATE INDEX IF NOT EXISTS idx_teacher_wallets_teacher_inst ON public.teacher_wallets(teacher_id, institution_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_inst_id ON public.wallet_transactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_teacher_id ON public.wallet_transactions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_category ON public.wallet_transactions(transaction_category);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_created_at ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_ext_ref ON public.wallet_transactions(external_reference);

-- ============================================================================
-- 6. STORED PROCEDURES & ATOMIC CONCURRENCY ENGINE
-- ============================================================================

-- Function 6.1: Calculate Convenience Fee
CREATE OR REPLACE FUNCTION public.calculate_convenience_fee(
    p_amount NUMERIC,
    p_applies_to TEXT DEFAULT 'TEACHER_WITHDRAWAL'
)
RETURNS TABLE (
    fee_amount NUMERIC,
    fee_type VARCHAR,
    bearer VARCHAR,
    config_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_config RECORD;
    v_calculated NUMERIC := 0.00;
BEGIN
    SELECT * INTO v_config 
    FROM public.convenience_fee_configs 
    WHERE is_active = TRUE 
      AND (applies_to = p_applies_to OR applies_to = 'ALL_PAYOUTS')
    ORDER BY created_at DESC 
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 0.00::NUMERIC, 'FREE'::VARCHAR, 'TEACHER'::VARCHAR, NULL::UUID;
        RETURN;
    END IF;

    IF v_config.fee_type = 'FREE' THEN
        v_calculated := 0.00;
    ELSIF v_config.fee_type = 'FIXED' THEN
        v_calculated := v_config.fixed_amount;
    ELSIF v_config.fee_type = 'PERCENTAGE' THEN
        v_calculated := ROUND((p_amount * (v_config.percentage_rate / 100.0)), 2);
    ELSIF v_config.fee_type = 'HYBRID' THEN
        v_calculated := ROUND(v_config.fixed_amount + (p_amount * (v_config.percentage_rate / 100.0)), 2);
    END IF;

    -- Apply bounds
    IF v_config.min_fee > 0 AND v_calculated < v_config.min_fee THEN
        v_calculated := v_config.min_fee;
    END IF;
    IF v_config.max_fee > 0 AND v_calculated > v_config.max_fee THEN
        v_calculated := v_config.max_fee;
    END IF;

    RETURN QUERY SELECT v_calculated, v_config.fee_type, v_config.fee_bearer, v_config.id;
END;
$$;

-- Function 6.2: Top Up School Float Wallet (Atomic Credit)
CREATE OR REPLACE FUNCTION public.topup_institution_wallet(
    p_institution_id TEXT,
    p_amount NUMERIC,
    p_payment_ref TEXT,
    p_phone TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT 'M-Pesa Float Top-Up'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet RECORD;
    v_new_balance NUMERIC;
    v_txn_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Top-up amount must be strictly greater than 0';
    END IF;

    -- Lock institution wallet row for update
    SELECT * INTO v_wallet 
    FROM public.institution_wallets 
    WHERE institution_id = p_institution_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Auto-provision wallet if missing
        INSERT INTO public.institution_wallets (institution_id, current_balance, reserved_balance)
        VALUES (p_institution_id, p_amount, 0.00)
        RETURNING * INTO v_wallet;

        v_new_balance := p_amount;
    ELSE
        IF v_wallet.is_locked THEN
            RAISE EXCEPTION 'Institution float wallet is locked: %', v_wallet.lock_reason;
        END IF;

        v_new_balance := v_wallet.current_balance + p_amount;
        UPDATE public.institution_wallets
        SET current_balance = v_new_balance,
            updated_at = NOW()
        WHERE id = v_wallet.id;
    END IF;

    -- Insert ledger entry
    INSERT INTO public.wallet_transactions (
        institution_id,
        wallet_type,
        institution_wallet_id,
        transaction_category,
        flow_type,
        amount,
        convenience_fee,
        net_amount,
        balance_before,
        balance_after,
        status,
        external_reference,
        payment_method,
        phone_number,
        notes
    ) VALUES (
        p_institution_id,
        'INSTITUTION',
        v_wallet.id,
        'FLOAT_TOPUP',
        'CREDIT',
        p_amount,
        0.00,
        p_amount,
        COALESCE(v_wallet.current_balance, 0.00),
        v_new_balance,
        'COMPLETED',
        p_payment_ref,
        'MPESA',
        p_phone,
        p_notes
    ) RETURNING id INTO v_txn_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_txn_id,
        'institution_id', p_institution_id,
        'amount', p_amount,
        'balance_before', COALESCE(v_wallet.current_balance, 0.00),
        'new_balance', v_new_balance
    );
END;
$$;

-- Function 6.3: Disburse Payout to Teacher Wallet (Instant Float Debit & Teacher Wallet Credit)
CREATE OR REPLACE FUNCTION public.disburse_payout_to_teacher_wallet(
    p_institution_id TEXT,
    p_teacher_id TEXT,
    p_amount NUMERIC,
    p_payout_id TEXT DEFAULT NULL,
    p_session_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    p_notes TEXT DEFAULT 'Remedial Session Payout Disbursed'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inst_wallet RECORD;
    v_teacher_wallet RECORD;
    v_inst_new_bal NUMERIC;
    v_teacher_new_bal NUMERIC;
    v_inst_txn_id UUID;
    v_teacher_txn_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Disbursement amount must be strictly greater than 0';
    END IF;

    -- 1. Lock and verify Institution Float Wallet
    SELECT * INTO v_inst_wallet
    FROM public.institution_wallets
    WHERE institution_id = p_institution_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'School float wallet not found for institution %', p_institution_id;
    END IF;

    IF v_inst_wallet.is_locked THEN
        RAISE EXCEPTION 'School float wallet is locked: %', v_inst_wallet.lock_reason;
    END IF;

    IF v_inst_wallet.current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient school float balance (Available: KES %, Required: KES %). Please top up the school float wallet.', 
            v_inst_wallet.current_balance, p_amount;
    END IF;

    -- 2. Deduct from School Float
    v_inst_new_bal := v_inst_wallet.current_balance - p_amount;
    UPDATE public.institution_wallets
    SET current_balance = v_inst_new_bal,
        updated_at = NOW()
    WHERE id = v_inst_wallet.id;

    -- 3. Lock and credit Teacher Wallet
    SELECT * INTO v_teacher_wallet
    FROM public.teacher_wallets
    WHERE teacher_id = p_teacher_id AND institution_id = p_institution_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.teacher_wallets (
            teacher_id,
            institution_id,
            available_balance,
            total_earned
        ) VALUES (
            p_teacher_id,
            p_institution_id,
            p_amount,
            p_amount
        ) RETURNING * INTO v_teacher_wallet;

        v_teacher_new_bal := p_amount;
    ELSE
        IF v_teacher_wallet.is_locked THEN
            RAISE EXCEPTION 'Teacher wallet is locked: %', v_teacher_wallet.lock_reason;
        END IF;

        v_teacher_new_bal := v_teacher_wallet.available_balance + p_amount;
        UPDATE public.teacher_wallets
        SET available_balance = v_teacher_new_bal,
            total_earned = v_teacher_wallet.total_earned + p_amount,
            updated_at = NOW()
        WHERE id = v_teacher_wallet.id;
    END IF;

    -- 4. Record School Float Debit Ledger
    INSERT INTO public.wallet_transactions (
        institution_id,
        wallet_type,
        institution_wallet_id,
        teacher_id,
        transaction_category,
        flow_type,
        amount,
        convenience_fee,
        net_amount,
        balance_before,
        balance_after,
        status,
        related_payout_id,
        related_session_ids,
        notes
    ) VALUES (
        p_institution_id,
        'INSTITUTION',
        v_inst_wallet.id,
        p_teacher_id,
        'EARNING_CREDIT',
        'DEBIT',
        p_amount,
        0.00,
        p_amount,
        v_inst_wallet.current_balance,
        v_inst_new_bal,
        'COMPLETED',
        p_payout_id,
        p_session_ids,
        'Float debited for teacher payout: ' || p_notes
    ) RETURNING id INTO v_inst_txn_id;

    -- 5. Record Teacher Wallet Credit Ledger
    INSERT INTO public.wallet_transactions (
        institution_id,
        wallet_type,
        teacher_wallet_id,
        teacher_id,
        transaction_category,
        flow_type,
        amount,
        convenience_fee,
        net_amount,
        balance_before,
        balance_after,
        status,
        related_payout_id,
        related_session_ids,
        notes
    ) VALUES (
        p_institution_id,
        'TEACHER',
        v_teacher_wallet.id,
        p_teacher_id,
        'EARNING_CREDIT',
        'CREDIT',
        p_amount,
        0.00,
        p_amount,
        COALESCE(v_teacher_wallet.available_balance, 0.00),
        v_teacher_new_bal,
        'COMPLETED',
        p_payout_id,
        p_session_ids,
        'Earnings credited to wallet: ' || p_notes
    ) RETURNING id INTO v_teacher_txn_id;

    RETURN jsonb_build_object(
        'success', true,
        'school_new_balance', v_inst_new_bal,
        'teacher_new_balance', v_teacher_new_bal,
        'disbursed_amount', p_amount,
        'school_transaction_id', v_inst_txn_id,
        'teacher_transaction_id', v_teacher_txn_id
    );
END;
$$;

-- Function 6.4: Teacher Wallet Withdrawal to M-Pesa with Automatic Convenience Fee Split
CREATE OR REPLACE FUNCTION public.withdraw_teacher_wallet_mpesa(
    p_institution_id TEXT,
    p_teacher_id TEXT,
    p_amount NUMERIC,
    p_phone TEXT,
    p_external_ref TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT 'Teacher M-Pesa Cash-Out'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_teacher_wallet RECORD;
    v_fee_rec RECORD;
    v_net_to_teacher NUMERIC;
    v_teacher_new_bal NUMERIC;
    v_fee_amount NUMERIC := 0.00;
    v_revenue_wallet RECORD;
    v_teacher_txn_id UUID;
    v_super_admin_txn_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Withdrawal amount must be greater than 0';
    END IF;

    -- 1. Lock Teacher Wallet
    SELECT * INTO v_teacher_wallet
    FROM public.teacher_wallets
    WHERE teacher_id = p_teacher_id AND institution_id = p_institution_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Teacher wallet not found for teacher %', p_teacher_id;
    END IF;

    IF v_teacher_wallet.is_locked THEN
        RAISE EXCEPTION 'Teacher wallet is locked: %', v_teacher_wallet.lock_reason;
    END IF;

    IF v_teacher_wallet.available_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance (Available: KES %, Requested: KES %)', 
            v_teacher_wallet.available_balance, p_amount;
    END IF;

    -- 2. Calculate Convenience Fee
    SELECT * INTO v_fee_rec FROM public.calculate_convenience_fee(p_amount, 'TEACHER_WITHDRAWAL');
    v_fee_amount := COALESCE(v_fee_rec.fee_amount, 0.00);

    -- Ensure withdrawal covers fee if teacher bears fee
    IF v_fee_rec.bearer = 'TEACHER' THEN
        IF p_amount <= v_fee_amount THEN
            RAISE EXCEPTION 'Withdrawal amount (KES %) must exceed platform fee (KES %)', p_amount, v_fee_amount;
        END IF;
        v_net_to_teacher := p_amount - v_fee_amount;
    ELSE
        v_net_to_teacher := p_amount;
    END IF;

    -- 3. Update Teacher Wallet Balance
    v_teacher_new_bal := v_teacher_wallet.available_balance - p_amount;
    UPDATE public.teacher_wallets
    SET available_balance = v_teacher_new_bal,
        total_withdrawn = v_teacher_wallet.total_withdrawn + p_amount,
        mpesa_phone_number = COALESCE(p_phone, mpesa_phone_number),
        updated_at = NOW()
    WHERE id = v_teacher_wallet.id;

    -- 4. Credit Platform Revenue Wallet if fee > 0
    IF v_fee_amount > 0 THEN
        SELECT * INTO v_revenue_wallet
        FROM public.super_admin_revenue_wallets
        WHERE currency = 'KES'
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.super_admin_revenue_wallets
            SET available_balance = available_balance + v_fee_amount,
                total_fees_collected = total_fees_collected + v_fee_amount,
                updated_at = NOW()
            WHERE id = v_revenue_wallet.id;

            -- Record Super Admin Convenience Fee Ledger
            INSERT INTO public.wallet_transactions (
                institution_id,
                wallet_type,
                teacher_id,
                transaction_category,
                flow_type,
                amount,
                convenience_fee,
                net_amount,
                balance_before,
                balance_after,
                status,
                external_reference,
                payment_method,
                notes
            ) VALUES (
                p_institution_id,
                'SUPER_ADMIN',
                p_teacher_id,
                'CONVENIENCE_FEE',
                'CREDIT',
                v_fee_amount,
                0.00,
                v_fee_amount,
                v_revenue_wallet.available_balance,
                v_revenue_wallet.available_balance + v_fee_amount,
                'COMPLETED',
                p_external_ref,
                'PLATFORM_LEDGER',
                'Platform convenience fee collected from teacher cash-out'
            ) RETURNING id INTO v_super_admin_txn_id;
        END IF;
    END IF;

    -- 5. Record Teacher Withdrawal Ledger
    INSERT INTO public.wallet_transactions (
        institution_id,
        wallet_type,
        teacher_wallet_id,
        teacher_id,
        transaction_category,
        flow_type,
        amount,
        convenience_fee,
        net_amount,
        balance_before,
        balance_after,
        status,
        external_reference,
        payment_method,
        phone_number,
        notes
    ) VALUES (
        p_institution_id,
        'TEACHER',
        v_teacher_wallet.id,
        p_teacher_id,
        'TEACHER_WITHDRAWAL',
        'DEBIT',
        p_amount,
        v_fee_amount,
        v_net_to_teacher,
        v_teacher_wallet.available_balance,
        v_teacher_new_bal,
        'COMPLETED',
        p_external_ref,
        'MPESA',
        p_phone,
        p_notes
    ) RETURNING id INTO v_teacher_txn_id;

    RETURN jsonb_build_object(
        'success', true,
        'teacher_id', p_teacher_id,
        'gross_amount', p_amount,
        'convenience_fee', v_fee_amount,
        'net_disbursed_mpesa', v_net_to_teacher,
        'teacher_new_balance', v_teacher_new_bal,
        'phone', p_phone,
        'teacher_transaction_id', v_teacher_txn_id,
        'super_admin_transaction_id', v_super_admin_txn_id
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_convenience_fee TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.topup_institution_wallet TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.disburse_payout_to_teacher_wallet TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_teacher_wallet_mpesa TO authenticated, anon;
