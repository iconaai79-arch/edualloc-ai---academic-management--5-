-- Migration 510: Fix mutable search_path on public.bulk_assign_ds_students_branch
-- Purpose: Resolves Supabase Security Advisor warning: "Function public.bulk_assign_ds_students_branch has a role mutable search_path"
-- Path: database/migrations/510_fix_bulk_assign_ds_students_branch_search_path.sql

CREATE OR REPLACE FUNCTION public.bulk_assign_ds_students_branch(
    p_student_ids TEXT[],
    p_target_branch_id TEXT,
    p_institution_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated_count INT := 0;
BEGIN
    -- Verify target branch belongs to institution if not null
    IF p_target_branch_id IS NOT NULL AND p_target_branch_id <> '' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.branches 
            WHERE id = p_target_branch_id AND institution_id = p_institution_id
        ) THEN
            RAISE EXCEPTION 'Target branch % does not belong to institution %', p_target_branch_id, p_institution_id;
        END IF;
    END IF;

    -- Perform bulk update
    UPDATE public.ds_students
    SET 
        branch_id = NULLIF(p_target_branch_id, ''),
        updated_at = NOW()
    WHERE 
        institution_id = p_institution_id
        AND id = ANY(p_student_ids);

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_updated_count,
        'target_branch_id', p_target_branch_id
    );
END;
$$;

-- Explicitly ensure search_path is locked on the function configuration
ALTER FUNCTION public.bulk_assign_ds_students_branch(TEXT[], TEXT, TEXT) SET search_path = public, pg_temp;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
