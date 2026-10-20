-- Migration 519: Fix Row Level Security (RLS) Policies on Wallets and Teacher Wallets
-- Resolves Postgres error 42501: "new row violates row-level security policy for table \"teacher_wallets\""

-- ============================================================================
-- 1. TEACHER WALLETS (teacher_wallets)
-- ============================================================================
ALTER TABLE public.teacher_wallets ENABLE ROW LEVEL SECURITY;

-- Clean up any previous conflicting or restrictive policies
DROP POLICY IF EXISTS "teacher_wallets_all_access" ON public.teacher_wallets;
DROP POLICY IF EXISTS "teacher_wallets_select" ON public.teacher_wallets;
DROP POLICY IF EXISTS "teacher_wallets_insert" ON public.teacher_wallets;
DROP POLICY IF EXISTS "teacher_wallets_update" ON public.teacher_wallets;
DROP POLICY IF EXISTS "teacher_wallets_delete" ON public.teacher_wallets;
DROP POLICY IF EXISTS "Institutional tenancy select: teacher_wallets" ON public.teacher_wallets;
DROP POLICY IF EXISTS "Institutional tenancy insert: teacher_wallets" ON public.teacher_wallets;
DROP POLICY IF EXISTS "Institutional tenancy update: teacher_wallets" ON public.teacher_wallets;
DROP POLICY IF EXISTS "Institutional tenancy delete: teacher_wallets" ON public.teacher_wallets;

-- Scoped Institutional & Teacher RLS Policies
CREATE POLICY "teacher_wallets_select" ON public.teacher_wallets
    FOR SELECT TO authenticated, anon
    USING (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
        OR teacher_id::text = auth.uid()::text
    );

CREATE POLICY "teacher_wallets_insert" ON public.teacher_wallets
    FOR INSERT TO authenticated, anon
    WITH CHECK (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
        OR teacher_id::text = auth.uid()::text
    );

CREATE POLICY "teacher_wallets_update" ON public.teacher_wallets
    FOR UPDATE TO authenticated, anon
    USING (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
        OR teacher_id::text = auth.uid()::text
    )
    WITH CHECK (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
        OR teacher_id::text = auth.uid()::text
    );

CREATE POLICY "teacher_wallets_delete" ON public.teacher_wallets
    FOR DELETE TO authenticated
    USING (
        public.get_curr_user_role()::text = 'super_admin'
    );

GRANT ALL ON public.teacher_wallets TO anon, authenticated, service_role;


-- ============================================================================
-- 2. INSTITUTION FLOAT WALLETS (institution_wallets)
-- ============================================================================
ALTER TABLE public.institution_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "institution_wallets_all_access" ON public.institution_wallets;
DROP POLICY IF EXISTS "institution_wallets_select" ON public.institution_wallets;
DROP POLICY IF EXISTS "institution_wallets_insert" ON public.institution_wallets;
DROP POLICY IF EXISTS "institution_wallets_update" ON public.institution_wallets;
DROP POLICY IF EXISTS "institution_wallets_delete" ON public.institution_wallets;

CREATE POLICY "institution_wallets_select" ON public.institution_wallets
    FOR SELECT TO authenticated, anon
    USING (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
    );

CREATE POLICY "institution_wallets_insert" ON public.institution_wallets
    FOR INSERT TO authenticated, anon
    WITH CHECK (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
    );

CREATE POLICY "institution_wallets_update" ON public.institution_wallets
    FOR UPDATE TO authenticated, anon
    USING (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
    )
    WITH CHECK (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
    );

CREATE POLICY "institution_wallets_delete" ON public.institution_wallets
    FOR DELETE TO authenticated
    USING (
        public.get_curr_user_role()::text = 'super_admin'
    );

GRANT ALL ON public.institution_wallets TO anon, authenticated, service_role;


-- ============================================================================
-- 3. WALLET TRANSACTIONS LEDGER (wallet_transactions)
-- ============================================================================
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_transactions_all_access" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_transactions_select" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_transactions_insert" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_transactions_update" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_transactions_delete" ON public.wallet_transactions;

CREATE POLICY "wallet_transactions_select" ON public.wallet_transactions
    FOR SELECT TO authenticated, anon
    USING (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
        OR teacher_id::text = auth.uid()::text
    );

CREATE POLICY "wallet_transactions_insert" ON public.wallet_transactions
    FOR INSERT TO authenticated, anon
    WITH CHECK (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
        OR teacher_id::text = auth.uid()::text
    );

CREATE POLICY "wallet_transactions_update" ON public.wallet_transactions
    FOR UPDATE TO authenticated, anon
    USING (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
    )
    WITH CHECK (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
    );

GRANT ALL ON public.wallet_transactions TO anon, authenticated, service_role;


-- ============================================================================
-- 4. CONVENIENCE FEE CONFIGS (convenience_fee_configs)
-- ============================================================================
ALTER TABLE public.convenience_fee_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "convenience_fee_configs_select" ON public.convenience_fee_configs;
DROP POLICY IF EXISTS "convenience_fee_configs_manage" ON public.convenience_fee_configs;

CREATE POLICY "convenience_fee_configs_select" ON public.convenience_fee_configs
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "convenience_fee_configs_manage" ON public.convenience_fee_configs
    FOR ALL TO authenticated, anon
    USING (
        public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
    );

GRANT ALL ON public.convenience_fee_configs TO anon, authenticated, service_role;


-- ============================================================================
-- 5. SUPER ADMIN REVENUE WALLETS (super_admin_revenue_wallets)
-- ============================================================================
ALTER TABLE public.super_admin_revenue_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_revenue_wallets_select" ON public.super_admin_revenue_wallets;
DROP POLICY IF EXISTS "super_admin_revenue_wallets_manage" ON public.super_admin_revenue_wallets;

CREATE POLICY "super_admin_revenue_wallets_select" ON public.super_admin_revenue_wallets
    FOR SELECT TO authenticated, anon
    USING (
        public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
    );

CREATE POLICY "super_admin_revenue_wallets_manage" ON public.super_admin_revenue_wallets
    FOR ALL TO authenticated, anon
    USING (
        public.get_curr_user_role()::text = 'super_admin'
    );

GRANT ALL ON public.super_admin_revenue_wallets TO anon, authenticated, service_role;


-- ============================================================================
-- 6. SECURITY DEFINER HELPER: Atomic Provisioning RPC Functions
-- ============================================================================

-- Function 6.1: Safe Atomic Teacher Wallet Provisioner
CREATE OR REPLACE FUNCTION public.get_or_create_teacher_wallet(
    p_teacher_id TEXT,
    p_institution_id TEXT,
    p_currency TEXT DEFAULT 'KES'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet RECORD;
BEGIN
    IF p_teacher_id IS NULL OR TRIM(p_teacher_id) = '' THEN
        RAISE EXCEPTION 'p_teacher_id cannot be null or empty';
    END IF;

    -- Attempt to fetch existing wallet
    SELECT * INTO v_wallet
    FROM public.teacher_wallets
    WHERE teacher_id = p_teacher_id 
      AND institution_id = p_institution_id;

    IF FOUND THEN
        RETURN to_jsonb(v_wallet);
    END IF;

    -- If not found, insert atomic with ON CONFLICT DO NOTHING
    INSERT INTO public.teacher_wallets (
        teacher_id,
        institution_id,
        currency,
        available_balance,
        pending_balance,
        total_withdrawn,
        total_earned
    ) VALUES (
        p_teacher_id,
        p_institution_id,
        COALESCE(p_currency, 'KES'),
        0.00,
        0.00,
        0.00,
        0.00
    )
    ON CONFLICT (teacher_id, institution_id) DO NOTHING;

    -- Fetch the existing or newly created row
    SELECT * INTO v_wallet
    FROM public.teacher_wallets
    WHERE teacher_id = p_teacher_id 
      AND institution_id = p_institution_id;

    RETURN to_jsonb(v_wallet);
END;
$$;

-- Function 6.2: Safe Atomic Institution Float Wallet Provisioner
CREATE OR REPLACE FUNCTION public.get_or_create_institution_wallet(
    p_institution_id TEXT,
    p_currency TEXT DEFAULT 'KES'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet RECORD;
BEGIN
    IF p_institution_id IS NULL OR TRIM(p_institution_id) = '' THEN
        RAISE EXCEPTION 'p_institution_id cannot be null or empty';
    END IF;

    -- Attempt to fetch existing wallet
    SELECT * INTO v_wallet
    FROM public.institution_wallets
    WHERE institution_id = p_institution_id;

    IF FOUND THEN
        RETURN to_jsonb(v_wallet);
    END IF;

    -- If not found, insert atomic with ON CONFLICT DO NOTHING
    INSERT INTO public.institution_wallets (
        institution_id,
        currency,
        current_balance,
        reserved_balance,
        low_float_threshold
    ) VALUES (
        p_institution_id,
        COALESCE(p_currency, 'KES'),
        0.00,
        0.00,
        10000.00
    )
    ON CONFLICT (institution_id) DO NOTHING;

    SELECT * INTO v_wallet
    FROM public.institution_wallets
    WHERE institution_id = p_institution_id;

    RETURN to_jsonb(v_wallet);
END;
$$;

-- Grant EXECUTE on functions to all client roles
GRANT EXECUTE ON FUNCTION public.get_or_create_teacher_wallet(TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_institution_wallet(TEXT, TEXT) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
