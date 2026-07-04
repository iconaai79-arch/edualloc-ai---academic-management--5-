-- Migration: 251_update_save_audit_run
-- Description: Update save_audit_run function to support custom UUID primary keys for issues, falling back to gen_random_uuid() if not valid.

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
    v_issue_id  UUID;
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
        BEGIN
            v_issue_id := (v_issue->>'id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_issue_id := gen_random_uuid();
        END;

        INSERT INTO public.audit_issues (
            id, report_id, institution_id, issue_type, severity, message,
            record_id, table_name, amount, metadata, detected_at
        ) VALUES (
            v_issue_id,
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
