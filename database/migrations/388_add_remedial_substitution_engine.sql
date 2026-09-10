-- Migration: 388_add_remedial_substitution_engine.sql
-- Description: Add teacher cancellation, auto-substitution tracking, deadlines, and cutoff settings to remedial system

-- 1. Extend school_remedial_allocations with substitution tracking
ALTER TABLE IF EXISTS public.school_remedial_allocations 
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Confirmed',
    ADD COLUMN IF NOT EXISTS substitute_teacher_id TEXT,
    ADD COLUMN IF NOT EXISTS substitute_teacher_name TEXT,
    ADD COLUMN IF NOT EXISTS original_teacher_id TEXT,
    ADD COLUMN IF NOT EXISTS original_teacher_name TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS declined_teacher_ids JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.school_remedial_allocations.status IS 'Allocation status: Confirmed, Substitute Pending, Cancelled, Completed, Escalated to DOS';
COMMENT ON COLUMN public.school_remedial_allocations.substitute_teacher_id IS 'User ID of candidate or assigned substitute teacher';
COMMENT ON COLUMN public.school_remedial_allocations.confirmation_deadline IS 'Timestamp when the substitute teacher must accept before cascading to next candidate';
COMMENT ON COLUMN public.school_remedial_allocations.declined_teacher_ids IS 'Array of teacher IDs who declined or timed out for this substitution';

-- 2. Extend school_remedial_rate_settings with cutoff and timeout configuration
ALTER TABLE IF EXISTS public.school_remedial_rate_settings 
    ADD COLUMN IF NOT EXISTS cancellation_cutoff_hours NUMERIC DEFAULT 3,
    ADD COLUMN IF NOT EXISTS confirmation_timeout_minutes NUMERIC DEFAULT 45;

COMMENT ON COLUMN public.school_remedial_rate_settings.cancellation_cutoff_hours IS 'Minimum hours before session start that a teacher can cancel and request auto-substitution';
COMMENT ON COLUMN public.school_remedial_rate_settings.confirmation_timeout_minutes IS 'Minutes given to a substitute teacher to confirm availability before cascading';

-- 3. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
