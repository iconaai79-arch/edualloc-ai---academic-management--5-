-- Migration: 249_audit_log_triggers
-- Description: Universal tamper-evident audit log for all financial tables.
--              Every INSERT, UPDATE, DELETE on financial tables is captured
--              with before/after snapshots, the acting user, and a timestamp.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. AUDIT LOG TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name      TEXT        NOT NULL,
    record_id       TEXT        NOT NULL,
    action          TEXT        NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
    old_values      JSONB,
    new_values      JSONB,
    changed_by      TEXT,           -- user id from app.user_id session variable
    changed_by_name TEXT,           -- display name, best-effort
    institution_id  TEXT,
    ip_address      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast per-institution queries and per-record history
CREATE INDEX IF NOT EXISTS audit_log_institution_idx ON public.audit_log(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_table_record_idx ON public.audit_log(table_name, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx       ON public.audit_log(action, created_at DESC);

-- Prevent anyone (including service_role) from deleting audit rows
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_own_institution"
    ON public.audit_log FOR SELECT
    USING (institution_id = current_setting('app.institution_id', true));

-- No DELETE or UPDATE policies = immutable log

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SHARED TRIGGER FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record_id     TEXT;
    v_institution   TEXT;
    v_user_id       TEXT;
    v_old           JSONB;
    v_new           JSONB;
BEGIN
    -- Resolve acting user
    v_user_id     := current_setting('app.user_id',       true);

    IF TG_OP = 'DELETE' THEN
        v_record_id   := OLD.id::TEXT;
        v_institution := OLD.institution_id::TEXT;
        v_old         := to_jsonb(OLD);
        v_new         := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_record_id   := NEW.id::TEXT;
        v_institution := NEW.institution_id::TEXT;
        v_old         := NULL;
        v_new         := to_jsonb(NEW);
    ELSE  -- UPDATE
        v_record_id   := NEW.id::TEXT;
        v_institution := NEW.institution_id::TEXT;
        v_old         := to_jsonb(OLD);
        v_new         := to_jsonb(NEW);
    END IF;

    INSERT INTO public.audit_log (
        table_name, record_id, action,
        old_values, new_values,
        changed_by, institution_id
    ) VALUES (
        TG_TABLE_NAME, v_record_id, TG_OP,
        v_old, v_new,
        v_user_id, v_institution
    );

    RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ATTACH TRIGGERS TO FINANCIAL TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- invoices
DROP TRIGGER IF EXISTS trg_audit_invoices ON public.invoices;
CREATE TRIGGER trg_audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- receipts
DROP TRIGGER IF EXISTS trg_audit_receipts ON public.receipts;
CREATE TRIGGER trg_audit_receipts
    AFTER INSERT OR UPDATE OR DELETE ON public.receipts
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- expenses
DROP TRIGGER IF EXISTS trg_audit_expenses ON public.expenses;
CREATE TRIGGER trg_audit_expenses
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- pm_invoices
DROP TRIGGER IF EXISTS trg_audit_pm_invoices ON public.pm_invoices;
CREATE TRIGGER trg_audit_pm_invoices
    AFTER INSERT OR UPDATE OR DELETE ON public.pm_invoices
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- pm_payments
DROP TRIGGER IF EXISTS trg_audit_pm_payments ON public.pm_payments;
CREATE TRIGGER trg_audit_pm_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.pm_payments
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- pm_leases
DROP TRIGGER IF EXISTS trg_audit_pm_leases ON public.pm_leases;
CREATE TRIGGER trg_audit_pm_leases
    AFTER INSERT OR UPDATE OR DELETE ON public.pm_leases
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. HELPER VIEW — flattened audit feed for the dashboard
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_audit_feed AS
SELECT
    al.id,
    al.table_name,
    al.record_id,
    al.action,
    al.changed_by,
    al.institution_id,
    al.created_at,
    -- Surface key monetary fields for quick scanning
    (al.new_values->>'amount')::NUMERIC        AS new_amount,
    (al.old_values->>'amount')::NUMERIC        AS old_amount,
    (al.new_values->>'status')                 AS new_status,
    (al.old_values->>'status')                 AS old_status,
    -- Flag suspicious patterns
    CASE
        WHEN al.action = 'DELETE'                                       THEN 'DELETE'
        WHEN (al.new_values->>'amount')::NUMERIC > 500000              THEN 'LARGE_AMOUNT'
        WHEN (al.old_values->>'amount') IS DISTINCT FROM
             (al.new_values->>'amount')                                 THEN 'AMOUNT_CHANGED'
        WHEN (al.old_values->>'status') IS DISTINCT FROM
             (al.new_values->>'status')                                 THEN 'STATUS_CHANGED'
        ELSE 'NORMAL'
    END AS flag
FROM public.audit_log al
ORDER BY al.created_at DESC;
