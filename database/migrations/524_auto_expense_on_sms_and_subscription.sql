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
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'institutions') THEN
        SELECT EXISTS (
            SELECT 1 FROM public.institutions 
            WHERE (id = p_inst_id OR id = v_clean_id OR id = v_with_prefix)
              AND (
                LOWER(COALESCE(institution_type, '')) LIKE '%driving%' OR
                LOWER(COALESCE(category, '')) LIKE '%driving%' OR
                LOWER(COALESCE(name, '')) LIKE '%driving%'
              )
        ) INTO v_is_ds;
    END IF;

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
    IF v_is_ds AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_expenditures') THEN
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
    v_units TEXT;
    v_plan TEXT;
    v_has_txns_table BOOLEAN;
    v_has_metadata_col BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'mpesa_transactions'
    ) INTO v_has_txns_table;

    IF NOT v_has_txns_table THEN
        RAISE NOTICE 'public.mpesa_transactions does not exist, skipping backfill.';
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'mpesa_transactions' AND column_name = 'metadata'
    ) INTO v_has_metadata_col;

    IF NOT v_has_metadata_col THEN
        RAISE NOTICE 'public.mpesa_transactions.metadata column does not exist, skipping backfill.';
        RETURN;
    END IF;

    -- Dynamic SQL loop: type-safe regex matching that works regardless of whether metadata is TEXT, VARCHAR, JSON or JSONB
    FOR r IN EXECUTE 
        $query$
        SELECT 
            t.institution_id::text,
            t.amount::numeric,
            COALESCE(t.metadata::text, '') AS metadata_raw,
            COALESCE(t.transaction_id::text, t.id::text) AS ref_no,
            'M-Pesa' AS payment_method
        FROM public.mpesa_transactions t
        WHERE t.status = 'completed'
          AND t.amount > 0
          AND t.institution_id IS NOT NULL 
          AND t.institution_id::text NOT IN ('GLOBAL', 'SYSTEM', 'null', '')
          AND (
            LOWER(t.metadata::text) ~ '"type"\s*:\s*"(sms|sms_topup)"'
            OR LOWER(t.metadata::text) ~ '"purpose"\s*:\s*"sms"'
            OR LOWER(t.metadata::text) ~ '"type"\s*:\s*"(subscription|license)"'
            OR LOWER(t.metadata::text) ~ '"purpose"\s*:\s*"subscription"'
          )
        $query$
    LOOP
        BEGIN
            IF LOWER(r.metadata_raw) ~ '"(type|purpose)"\s*:\s*"sms' THEN
                v_type := 'sms';
                v_units := SUBSTRING(r.metadata_raw FROM '"units"\s*:\s*"?([0-9]+)"?');
                IF v_units IS NOT NULL AND v_units <> '' THEN
                    v_desc := 'SMS Units Purchase - ' || v_units || ' units';
                ELSE
                    v_desc := 'SMS Units Purchase';
                END IF;
            ELSE
                v_type := 'subscription';
                v_plan := SUBSTRING(r.metadata_raw FROM '"plan"\s*:\s*"([^"]+)"');
                IF v_plan IS NOT NULL AND v_plan <> '' THEN
                    v_desc := 'Subscription Renewal (' || INITCAP(v_plan) || ')';
                ELSE
                    v_desc := 'Software Subscription Renewal';
                END IF;
            END IF;

            PERFORM public.record_platform_expense_entry(
                r.institution_id,
                r.amount,
                v_type,
                v_desc,
                r.payment_method,
                r.ref_no,
                'System Backfill'
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
    
    RAISE NOTICE 'Auto-expense migration & backfill completed successfully.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Backfill notice: %', SQLERRM;
END $$;
