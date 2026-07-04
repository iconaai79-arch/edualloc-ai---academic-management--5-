-- Migration: 250_audit_reports_table
-- Description: Persists scheduled and on-demand audit run results so the
--              Finance Officer can review historical audit reports over time.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. AUDIT REPORTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_reports (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id  TEXT        NOT NULL,
    period          TEXT        NOT NULL,           -- e.g. "2026-07"
    run_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    triggered_by    TEXT        DEFAULT 'manual',   -- 'manual' | 'scheduled'
    overall_risk    TEXT        NOT NULL,            -- INFO/LOW/MEDIUM/HIGH/CRITICAL
    total_issues    INT         NOT NULL DEFAULT 0,
    critical_count  INT         NOT NULL DEFAULT 0,
    high_count      INT         NOT NULL DEFAULT 0,
    medium_count    INT         NOT NULL DEFAULT 0,
    low_count       INT         NOT NULL DEFAULT 0,
    info_count      INT         NOT NULL DEFAULT 0,
    total_billed    NUMERIC     NOT NULL DEFAULT 0,
    total_collected NUMERIC     NOT NULL DEFAULT 0,
    collection_rate NUMERIC     NOT NULL DEFAULT 0, -- percentage
    outstanding     NUMERIC     NOT NULL DEFAULT 0,
    issues_json     JSONB,                          -- full AuditIssue[] payload
    summary_json    JSONB                           -- AuditSummary payload
);

CREATE INDEX IF NOT EXISTS audit_reports_institution_idx
    ON public.audit_reports (institution_id, run_at DESC);

CREATE INDEX IF NOT EXISTS audit_reports_risk_idx
    ON public.audit_reports (institution_id, overall_risk, run_at DESC);

-- RLS: finance officers read own institution's reports
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_reports_read_own"
    ON public.audit_reports FOR SELECT
    USING (institution_id = current_setting('app.institution_id', true));

CREATE POLICY "audit_reports_insert_own"
    ON public.audit_reports FOR INSERT
    WITH CHECK (institution_id = current_setting('app.institution_id', true));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. AUDIT ISSUES TABLE (normalised rows for querying)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_issues (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id       UUID        NOT NULL REFERENCES public.audit_reports(id) ON DELETE CASCADE,
    institution_id  TEXT        NOT NULL,
    issue_type      TEXT        NOT NULL,
    severity        TEXT        NOT NULL,
    message         TEXT        NOT NULL,
    record_id       TEXT,
    table_name      TEXT,
    amount          NUMERIC,
    metadata        JSONB,
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_resolved     BOOLEAN     NOT NULL DEFAULT false,
    resolved_by     TEXT,
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT
);

CREATE INDEX IF NOT EXISTS audit_issues_report_idx
    ON public.audit_issues (report_id, severity);

CREATE INDEX IF NOT EXISTS audit_issues_institution_idx
    ON public.audit_issues (institution_id, severity, detected_at DESC);

CREATE INDEX IF NOT EXISTS audit_issues_unresolved_idx
    ON public.audit_issues (institution_id, is_resolved, severity)
    WHERE is_resolved = false;

ALTER TABLE public.audit_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_issues_read_own"
    ON public.audit_issues FOR SELECT
    USING (institution_id = current_setting('app.institution_id', true));

CREATE POLICY "audit_issues_insert_own"
    ON public.audit_issues FOR INSERT
    WITH CHECK (institution_id = current_setting('app.institution_id', true));

CREATE POLICY "audit_issues_update_own"
    ON public.audit_issues FOR UPDATE
    USING (institution_id = current_setting('app.institution_id', true));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. HELPER: Latest report per institution
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_latest_audit_report
WITH (security_invoker = true) AS
SELECT DISTINCT ON (institution_id)
    id, institution_id, period, run_at, triggered_by,
    overall_risk, total_issues, critical_count, high_count,
    medium_count, collection_rate, outstanding
FROM public.audit_reports
ORDER BY institution_id, run_at DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RPC: Save a complete audit run atomically
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_audit_run(
    p_institution_id  TEXT,
    p_period          TEXT,
    p_triggered_by    TEXT,
    p_summary         JSONB,
    p_issues          JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_report_id UUID;
    v_issue     JSONB;
BEGIN
    -- Insert report header
    INSERT INTO public.audit_reports (
        institution_id, period, triggered_by,
        overall_risk, total_issues,
        critical_count, high_count, medium_count, low_count, info_count,
        total_billed, total_collected, collection_rate, outstanding,
        issues_json, summary_json
    ) VALUES (
        p_institution_id, p_period, p_triggered_by,
        p_summary->>'overallRisk',
        (p_summary->>'totalIssues')::INT,
        (p_summary->>'critical')::INT,
        (p_summary->>'high')::INT,
        (p_summary->>'medium')::INT,
        (p_summary->>'low')::INT,
        (p_summary->>'info')::INT,
        (p_summary->>'totalBilled')::NUMERIC,
        (p_summary->>'totalCollected')::NUMERIC,
        (p_summary->>'collectionRate')::NUMERIC,
        (p_summary->>'outstandingDebt')::NUMERIC,
        p_issues, p_summary
    )
    RETURNING id INTO v_report_id;

    -- Insert normalised issue rows
    FOR v_issue IN SELECT * FROM jsonb_array_elements(p_issues)
    LOOP
        INSERT INTO public.audit_issues (
            report_id, institution_id, issue_type, severity, message,
            record_id, table_name, amount, metadata, detected_at
        ) VALUES (
            v_report_id,
            p_institution_id,
            v_issue->>'type',
            v_issue->>'severity',
            v_issue->>'message',
            v_issue->>'recordId',
            v_issue->>'table',
            (v_issue->>'amount')::NUMERIC,
            v_issue->'metadata',
            COALESCE((v_issue->>'detectedAt')::TIMESTAMPTZ, now())
        );
    END LOOP;

    RETURN v_report_id;
END;
$$;
