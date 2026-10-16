-- Migration: 486_ds_lessons_attendance_lifecycle.sql
-- Description: Enable complete attendance lifecycle for Driving School lessons:
--   1. Starting at beginning of Theory / Practical lessons (In-Progress check-in)
--   2. Ending at conclusion of Theory / Practical lessons (Completed check-out)
--   3. Reminder tracking columns and indexes for high-speed student lookup.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_lessons') THEN
        ALTER TABLE public.ds_lessons ADD COLUMN IF NOT EXISTS check_in_time TEXT;
        ALTER TABLE public.ds_lessons ADD COLUMN IF NOT EXISTS check_out_time TEXT;
        ALTER TABLE public.ds_lessons ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
        ALTER TABLE public.ds_lessons ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
        ALTER TABLE public.ds_lessons ADD COLUMN IF NOT EXISTS session_phase TEXT DEFAULT 'completed'; -- 'started', 'completed'
        ALTER TABLE public.ds_lessons ADD COLUMN IF NOT EXISTS attendance_logs JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.ds_lessons ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
        ALTER TABLE public.ds_lessons ADD COLUMN IF NOT EXISTS checkout_reminder_sent BOOLEAN DEFAULT false;

        -- Ensure student_id is nullable if needed for open sessions
        ALTER TABLE public.ds_lessons ALTER COLUMN student_id DROP NOT NULL;
    END IF;
END $$;

-- High performance composite indexes
CREATE INDEX IF NOT EXISTS idx_ds_lessons_student_date ON public.ds_lessons(student_id, lesson_date);
CREATE INDEX IF NOT EXISTS idx_ds_lessons_student_status ON public.ds_lessons(student_id, status);
CREATE INDEX IF NOT EXISTS idx_ds_lessons_inst_status ON public.ds_lessons(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_ds_lessons_inst_date ON public.ds_lessons(institution_id, lesson_date);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
