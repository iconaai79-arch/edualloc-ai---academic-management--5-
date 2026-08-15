-- ============================================================
-- Migration 325: Convert UUID columns to TEXT for observation_notes & fee_promises
-- ============================================================

-- 1. Drop ALL policies on observation_notes
DROP POLICY IF EXISTS "Institutional tenancy manage" ON public.observation_notes;
DROP POLICY IF EXISTS "Institutional tenancy read" ON public.observation_notes;
DROP POLICY IF EXISTS "Institutional tenancy insert" ON public.observation_notes;
DROP POLICY IF EXISTS "Institutional tenancy update" ON public.observation_notes;
DROP POLICY IF EXISTS "Institutional tenancy delete" ON public.observation_notes;
DROP POLICY IF EXISTS "Institutional tenancy all" ON public.observation_notes;
DROP POLICY IF EXISTS "Allow all on observation_notes" ON public.observation_notes;
DROP POLICY IF EXISTS "Allow authenticated read observation_notes" ON public.observation_notes;
DROP POLICY IF EXISTS "Allow authenticated insert observation_notes" ON public.observation_notes;
DROP POLICY IF EXISTS "Allow authenticated update observation_notes" ON public.observation_notes;
DROP POLICY IF EXISTS "Allow authenticated delete observation_notes" ON public.observation_notes;
DROP POLICY IF EXISTS "observation_notes_policy" ON public.observation_notes;

ALTER TABLE public.observation_notes DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL policies on fee_promises
DROP POLICY IF EXISTS "Institutional tenancy manage" ON public.fee_promises;
DROP POLICY IF EXISTS "Institutional tenancy read" ON public.fee_promises;
DROP POLICY IF EXISTS "Institutional tenancy insert" ON public.fee_promises;
DROP POLICY IF EXISTS "Institutional tenancy update" ON public.fee_promises;
DROP POLICY IF EXISTS "Institutional tenancy delete" ON public.fee_promises;
DROP POLICY IF EXISTS "Institutional tenancy all" ON public.fee_promises;
DROP POLICY IF EXISTS "Allow all on fee_promises" ON public.fee_promises;
DROP POLICY IF EXISTS "Allow authenticated read fee_promises" ON public.fee_promises;
DROP POLICY IF EXISTS "Allow authenticated insert fee_promises" ON public.fee_promises;
DROP POLICY IF EXISTS "Allow authenticated update fee_promises" ON public.fee_promises;
DROP POLICY IF EXISTS "Allow authenticated delete fee_promises" ON public.fee_promises;
DROP POLICY IF EXISTS "fee_promises_policy" ON public.fee_promises;

ALTER TABLE public.fee_promises DISABLE ROW LEVEL SECURITY;

-- 3. Alter observation_notes column types to TEXT
ALTER TABLE public.observation_notes ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
ALTER TABLE public.observation_notes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.observation_notes ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.observation_notes ALTER COLUMN timetable_entry_id TYPE TEXT USING timetable_entry_id::text;
ALTER TABLE public.observation_notes ALTER COLUMN practice_teacher_id TYPE TEXT USING practice_teacher_id::text;
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS lecturer_id TEXT;

-- 4. Alter fee_promises column types to TEXT
ALTER TABLE public.fee_promises ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
ALTER TABLE public.fee_promises ALTER COLUMN student_id TYPE TEXT USING student_id::text;
ALTER TABLE public.fee_promises ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.fee_promises ALTER COLUMN id TYPE TEXT USING id::text;

-- 5. Re-enable RLS and create fresh policies
ALTER TABLE public.observation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_promises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on observation_notes" ON public.observation_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on fee_promises" ON public.fee_promises FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.observation_notes TO anon, authenticated, service_role;
GRANT ALL ON public.fee_promises TO anon, authenticated, service_role;

-- 6. Fix save_audit_run RPC
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

    FOR v_issue IN SELECT * FROM jsonb_array_elements(p_issues)
    LOOP
        INSERT INTO public.audit_issues (
            id, report_id, institution_id, issue_type, severity, message,
            record_id, table_name, amount, metadata, detected_at
        ) VALUES (
            gen_random_uuid(),
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
