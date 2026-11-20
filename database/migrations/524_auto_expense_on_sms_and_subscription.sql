-- Migration: 524_auto_expense_on_sms_and_subscription.sql
-- Automatically record SMS unit top-ups and subscription renewals as expenses in public.expenses
-- and for driving schools in public.ds_expenditures.

-- 1. Ensure public.expenses has all standard and alias columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS id TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Operations';
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'M-Pesa';
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS reference_number TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payee_name TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS "payeeName" TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recorded_by TEXT DEFAULT 'System';
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS "recordedBy" TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ELSE
        CREATE TABLE public.expenses (
            id TEXT PRIMARY KEY,
            institution_id TEXT NOT NULL,
            "institutionId" TEXT,
            category TEXT NOT NULL DEFAULT 'Operations',
            amount NUMERIC NOT NULL DEFAULT 0,
            description TEXT NOT NULL,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            status TEXT NOT NULL DEFAULT 'approved',
            payment_method TEXT DEFAULT 'M-Pesa',
            "paymentMethod" TEXT,
            reference_number TEXT,
            "referenceNumber" TEXT,
            payee_name TEXT,
            "payeeName" TEXT,
            recorded_by TEXT DEFAULT 'System',
            "recordedBy" TEXT,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Ensure public.ds_expenditures has all standard columns for Driving Schools
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_expenditures') THEN
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS id TEXT;
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS branch_id TEXT;
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Operations';
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE;
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS "expenseDate" DATE;
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'M-Pesa';
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS reference_number TEXT;
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS paid_to TEXT;
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS recorded_by TEXT DEFAULT 'System';
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ELSE
        CREATE TABLE public.ds_expenditures (
            id TEXT PRIMARY KEY,
            institution_id TEXT NOT NULL,
            "institutionId" TEXT,
            branch_id TEXT,
            category TEXT NOT NULL DEFAULT 'Operations',
            amount NUMERIC NOT NULL DEFAULT 0,
            description TEXT NOT NULL,
            expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
            "expenseDate" DATE,
            payment_method TEXT DEFAULT 'M-Pesa',
            reference_number TEXT,
            paid_to TEXT,
            recorded_by TEXT DEFAULT 'System',
            notes TEXT,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 3. Stored Procedure to record platform expense (SMS or Subscription)
CREATE OR REPLACE FUNCTION public.record_platform_expense_entry(
    p_inst_id TEXT,
    p_amount NUMERIC,
    p_type TEXT,
    p_description TEXT,
    p_payment_method TEXT,
    p_reference TEXT,
    p_recorded_by TEXT DEFAULT 'System'
)
RETURNS VOID AS $$
DECLARE
    v_clean_id TEXT;
    v_with_prefix TEXT;
    v_is_ds BOOLEAN := FALSE;
    v_category TEXT;
    v_payee TEXT := 'EduAI Platform / Talksasa';
    v_exp_id TEXT;
    v_ds_exp_id TEXT;
    v_date DATE := CURRENT_DATE;
BEGIN
    IF p_inst_id IS NULL OR p_inst_id = '' OR p_inst_id IN ('GLOBAL', 'SYSTEM') OR p_amount IS NULL OR p_amount <= 0 THEN
        RETURN;
    END IF;

    v_clean_id := REGEXP_REPLACE(p_inst_id, '^inst_', '', 'i');
    v_with_prefix := 'inst_' || v_clean_id;

    -- Check if institution is a Driving School
    SELECT EXISTS (
        SELECT 1 FROM public.institutions 
        WHERE (id = p_inst_id OR id = v_clean_id OR id = v_with_prefix)
          AND (
            LOWER(COALESCE(institution_type, '')) LIKE '%driving%' OR
            LOWER(COALESCE(category, '')) LIKE '%driving%' OR
            LOWER(COALESCE(name, '')) LIKE '%driving%'
          )
    ) INTO v_is_ds;

    v_category := CASE WHEN LOWER(p_type) = 'sms' THEN 'Utilities' ELSE 'Operations' END;
    v_exp_id := 'exp_' || LOWER(p_type) || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);

    -- 1. Insert into public.expenses if not already present
    IF NOT EXISTS (
        SELECT 1 FROM public.expenses 
        WHERE (institution_id = p_inst_id OR institution_id = v_clean_id OR institution_id = v_with_prefix)
          AND (reference_number = p_reference OR "referenceNumber" = p_reference)
          AND reference_number IS NOT NULL AND reference_number <> ''
    ) THEN
        INSERT INTO public.expenses (
            id, institution_id, "institutionId", category, amount, description, 
            date, status, payment_method, "paymentMethod", reference_number, "referenceNumber",
            payee_name, "payeeName", recorded_by, "recordedBy", metadata
        ) VALUES (
            v_exp_id, p_inst_id, p_inst_id, v_category, p_amount, p_description,
            v_date, 'approved', COALESCE(p_payment_method, 'M-Pesa'), COALESCE(p_payment_method, 'M-Pesa'),
            p_reference, p_reference, v_payee, v_payee, COALESCE(p_recorded_by, 'System'), COALESCE(p_recorded_by, 'System'),
            jsonb_build_object('type', p_type, 'reference', p_reference, 'auto_generated', true)
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 2. If Driving School, insert into public.ds_expenditures as well
    IF v_is_ds THEN
        v_ds_exp_id := 'dsexp_' || LOWER(p_type) || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
        IF NOT EXISTS (
            SELECT 1 FROM public.ds_expenditures
            WHERE (institution_id = p_inst_id OR institution_id = v_clean_id OR institution_id = v_with_prefix)
              AND reference_number = p_reference
              AND reference_number IS NOT NULL AND reference_number <> ''
        ) THEN
            INSERT INTO public.ds_expenditures (
                id, institution_id, "institutionId", description, category, amount,
                payment_method, reference_number, paid_to, recorded_by, expense_date, notes
            ) VALUES (
                v_ds_exp_id, p_inst_id, p_inst_id, p_description, v_category, p_amount,
                COALESCE(p_payment_method, 'M-Pesa'), p_reference, v_payee, COALESCE(p_recorded_by, 'System'),
                v_date, p_description || ' (' || COALESCE(p_payment_method, 'M-Pesa') || ' Ref: ' || COALESCE(p_reference, '') || ')'
            )
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Retroactive backfill: Convert any existing completed SMS/Subscription M-Pesa transactions into expenses
DO $$
DECLARE
    r RECORD;
    v_type TEXT;
    v_desc TEXT;
    v_ref TEXT;
BEGIN
    FOR r IN 
        SELECT 
            t.institution_id,
            t.amount,
            t.phone_number,
            t.metadata,
            t.transaction_id,
            t.id,
            COALESCE(t.payment_method, 'M-Pesa') AS payment_method
        FROM public.mpesa_transactions t
        WHERE t.status = 'completed'
          AND t.amount > 0
          AND t.institution_id IS NOT NULL 
          AND t.institution_id NOT IN ('GLOBAL', 'SYSTEM')
          AND (
            LOWER(COALESCE(t.metadata->>'type', '')) IN ('sms', 'sms_topup', 'subscription', 'license')
            OR LOWER(COALESCE(t.metadata->>'purpose', '')) IN ('sms', 'subscription')
          )
    LOOP
        v_type := LOWER(COALESCE(r.metadata->>'type', r.metadata->>'purpose', ''));
        IF v_type LIKE '%sms%' THEN
            v_type := 'sms';
            v_desc := 'SMS Units Purchase - ' || COALESCE(r.metadata->>'units', 'Top-up') || ' units';
        ELSE
            v_type := 'subscription';
            v_desc := 'Subscription Renewal (' || COALESCE(r.metadata->>'plan', 'Enterprise') || ')';
        END IF;
        v_ref := COALESCE(r.transaction_id, r.id);

        PERFORM public.record_platform_expense_entry(
            r.institution_id,
            r.amount,
            v_type,
            v_desc,
            r.payment_method,
            v_ref,
            'System Backfill'
        );
    END LOOP;
END $$;
