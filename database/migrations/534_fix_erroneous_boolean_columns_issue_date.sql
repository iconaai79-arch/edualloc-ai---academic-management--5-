-- Migration 534: Fix erroneous BOOLEAN columns (issueDate, issuedDate, activeGradingSystemId, cancellationPolicy)
-- Fixes: "ERROR: invalid input syntax for type boolean: 2026-10-27T00:00:00.000Z"
-- Converts mistakenly typed BOOLEAN columns to TEXT/TIMESTAMPTZ.

DO $$ 
BEGIN 
    -- 1. invoices (issueDate & issue_date)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'issueDate' AND data_type = 'boolean') THEN 
        ALTER TABLE public."invoices" ALTER COLUMN "issueDate" DROP DEFAULT;
        ALTER TABLE public."invoices" ALTER COLUMN "issueDate" TYPE TEXT USING NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'issue_date' AND data_type = 'boolean') THEN 
        ALTER TABLE public."invoices" ALTER COLUMN "issue_date" DROP DEFAULT;
        ALTER TABLE public."invoices" ALTER COLUMN "issue_date" TYPE TEXT USING NULL;
    END IF;

    -- 2. library_transactions (issueDate & issue_date)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'library_transactions' AND column_name = 'issueDate' AND data_type = 'boolean') THEN 
        ALTER TABLE public."library_transactions" ALTER COLUMN "issueDate" DROP DEFAULT;
        ALTER TABLE public."library_transactions" ALTER COLUMN "issueDate" TYPE TEXT USING NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'library_transactions' AND column_name = 'issue_date' AND data_type = 'boolean') THEN 
        ALTER TABLE public."library_transactions" ALTER COLUMN "issue_date" DROP DEFAULT;
        ALTER TABLE public."library_transactions" ALTER COLUMN "issue_date" TYPE TEXT USING NULL;
    END IF;

    -- 3. pm_invoices (issueDate & issue_date)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pm_invoices' AND column_name = 'issueDate' AND data_type = 'boolean') THEN 
        ALTER TABLE public."pm_invoices" ALTER COLUMN "issueDate" DROP DEFAULT;
        ALTER TABLE public."pm_invoices" ALTER COLUMN "issueDate" TYPE TEXT USING NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pm_invoices' AND column_name = 'issue_date' AND data_type = 'boolean') THEN 
        ALTER TABLE public."pm_invoices" ALTER COLUMN "issue_date" DROP DEFAULT;
        ALTER TABLE public."pm_invoices" ALTER COLUMN "issue_date" TYPE TEXT USING NULL;
    END IF;

    -- 4. procurement_lpos (issuedDate & issued_date)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'procurement_lpos' AND column_name = 'issuedDate' AND data_type = 'boolean') THEN 
        ALTER TABLE public."procurement_lpos" ALTER COLUMN "issuedDate" DROP DEFAULT;
        ALTER TABLE public."procurement_lpos" ALTER COLUMN "issuedDate" TYPE TEXT USING NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'procurement_lpos' AND column_name = 'issued_date' AND data_type = 'boolean') THEN 
        ALTER TABLE public."procurement_lpos" ALTER COLUMN "issued_date" DROP DEFAULT;
        ALTER TABLE public."procurement_lpos" ALTER COLUMN "issued_date" TYPE TEXT USING NULL;
    END IF;

    -- 5. institutions (activeGradingSystemId & active_grading_system_id)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'activeGradingSystemId' AND data_type = 'boolean') THEN 
        ALTER TABLE public."institutions" ALTER COLUMN "activeGradingSystemId" DROP DEFAULT;
        ALTER TABLE public."institutions" ALTER COLUMN "activeGradingSystemId" TYPE TEXT USING NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'active_grading_system_id' AND data_type = 'boolean') THEN 
        ALTER TABLE public."institutions" ALTER COLUMN "active_grading_system_id" DROP DEFAULT;
        ALTER TABLE public."institutions" ALTER COLUMN "active_grading_system_id" TYPE TEXT USING NULL;
    END IF;

    -- 6. ds_settings (cancellationPolicy & cancellation_policy)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_settings' AND column_name = 'cancellationPolicy' AND data_type = 'boolean') THEN 
        ALTER TABLE public."ds_settings" ALTER COLUMN "cancellationPolicy" DROP DEFAULT;
        ALTER TABLE public."ds_settings" ALTER COLUMN "cancellationPolicy" TYPE TEXT USING NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_settings' AND column_name = 'cancellation_policy' AND data_type = 'boolean') THEN 
        ALTER TABLE public."ds_settings" ALTER COLUMN "cancellation_policy" DROP DEFAULT;
        ALTER TABLE public."ds_settings" ALTER COLUMN "cancellation_policy" TYPE TEXT USING NULL;
    END IF;
END $$;

-- 7. Universal dynamic check across all tables: any column with "date", "time", "policy", or "id" that is boolean
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND data_type = 'boolean'
          AND (
            column_name ILIKE '%date%' 
            OR column_name ILIKE '%time%' 
            OR column_name ILIKE '%policy%'
            OR column_name IN ('activeGradingSystemId', 'active_grading_system_id', 'cancellationPolicy', 'cancellation_policy', 'issueDate', 'issue_date', 'issuedDate', 'issued_date')
          )
    ) LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', r.table_name, r.column_name);
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE TEXT USING NULL', r.table_name, r.column_name);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
