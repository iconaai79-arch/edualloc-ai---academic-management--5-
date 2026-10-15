-- Migration 483: Optimize teacher_check_ins table indexes and query performance
-- Resolves statement timeout (57014) on teacher_check_ins queries

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'teacher_check_ins'
    ) THEN
        -- Ensure required columns exist
        ALTER TABLE public.teacher_check_ins ADD COLUMN IF NOT EXISTS check_in_date DATE DEFAULT CURRENT_DATE;
        ALTER TABLE public.teacher_check_ins ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE public.teacher_check_ins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 1. Primary composite index for tenant-scoped date descending reads (used by API default ORDER BY check_in_date DESC)
CREATE INDEX IF NOT EXISTS idx_tch_chk_inst_date 
    ON public.teacher_check_ins(institution_id, check_in_date DESC);

-- 2. Composite index for teacher-specific attendance history lookup
CREATE INDEX IF NOT EXISTS idx_tch_chk_teacher_date 
    ON public.teacher_check_ins(teacher_id, check_in_date DESC);

-- 3. Composite index covering tenant + teacher + date queries
CREATE INDEX IF NOT EXISTS idx_tch_chk_inst_teacher_date 
    ON public.teacher_check_ins(institution_id, teacher_id, check_in_date DESC);

-- 4. Single-column index for global/county date ordering (when institution_id filter is not supplied)
CREATE INDEX IF NOT EXISTS idx_tch_chk_date_desc 
    ON public.teacher_check_ins(check_in_date DESC);

-- 5. Fallback index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_tch_chk_inst_created_at 
    ON public.teacher_check_ins(institution_id, created_at DESC);

-- 6. Fallback index for primary id descending pagination
CREATE INDEX IF NOT EXISTS idx_tch_chk_inst_id_desc 
    ON public.teacher_check_ins(institution_id, id DESC);

-- 7. Analyze table to immediately update PostgreSQL query planner statistics
ANALYZE public.teacher_check_ins;

-- 8. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
