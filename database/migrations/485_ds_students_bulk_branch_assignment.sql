-- Migration: 485_ds_students_bulk_branch_assignment.sql
-- Description: Ensure ds_students has branch_id column with index, and provide bulk assignment helper function.

-- 1. Ensure branch_id exists on ds_students
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_students') THEN
        ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS branch_id TEXT;
        
        -- Safe foreign key if branches table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc 
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'ds_students' AND kcu.column_name = 'branch_id' AND tc.constraint_type = 'FOREIGN KEY'
            ) THEN
                BEGIN
                    ALTER TABLE public.ds_students 
                    ADD CONSTRAINT fk_ds_students_branch 
                    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
        END IF;
    END IF;
END $$;

-- 2. Indexes for fast branch filtering and lookups
CREATE INDEX IF NOT EXISTS idx_ds_students_branch_id ON public.ds_students(branch_id);
CREATE INDEX IF NOT EXISTS idx_ds_students_inst_branch ON public.ds_students(institution_id, branch_id);

-- 3. Stored function for high-performance atomic bulk branch assignment
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

-- 4. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
