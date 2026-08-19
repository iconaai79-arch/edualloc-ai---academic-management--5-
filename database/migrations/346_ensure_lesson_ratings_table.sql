-- Migration 346: Ensure lesson_ratings table and institution_id column
-- Description: Creates or alters the lesson_ratings table to include institution_id, sets up indexes, RLS policies, and reloads PostgREST schema cache.

CREATE TABLE IF NOT EXISTS public.lesson_ratings (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    student_id TEXT,
    lecturer_id TEXT,
    timetable_entry_id TEXT,
    rating NUMERIC DEFAULT 5,
    comment TEXT,
    feedback TEXT,
    timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all required columns exist if table was previously created without them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'lesson_ratings' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE public.lesson_ratings ADD COLUMN institution_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'lesson_ratings' AND column_name = 'student_id'
    ) THEN
        ALTER TABLE public.lesson_ratings ADD COLUMN student_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'lesson_ratings' AND column_name = 'lecturer_id'
    ) THEN
        ALTER TABLE public.lesson_ratings ADD COLUMN lecturer_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'lesson_ratings' AND column_name = 'timetable_entry_id'
    ) THEN
        ALTER TABLE public.lesson_ratings ADD COLUMN timetable_entry_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'lesson_ratings' AND column_name = 'rating'
    ) THEN
        ALTER TABLE public.lesson_ratings ADD COLUMN rating NUMERIC DEFAULT 5;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'lesson_ratings' AND column_name = 'comment'
    ) THEN
        ALTER TABLE public.lesson_ratings ADD COLUMN comment TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'lesson_ratings' AND column_name = 'feedback'
    ) THEN
        ALTER TABLE public.lesson_ratings ADD COLUMN feedback TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'lesson_ratings' AND column_name = 'timestamp'
    ) THEN
        ALTER TABLE public.lesson_ratings ADD COLUMN timestamp TIMESTAMPTZ DEFAULT now();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'lesson_ratings' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.lesson_ratings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_inst ON public.lesson_ratings(institution_id);
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_student ON public.lesson_ratings(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_lecturer ON public.lesson_ratings(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_timetable ON public.lesson_ratings(timetable_entry_id);

-- Enable RLS
ALTER TABLE public.lesson_ratings ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies
DROP POLICY IF EXISTS "lesson_ratings_all_access" ON public.lesson_ratings;
CREATE POLICY "lesson_ratings_all_access" ON public.lesson_ratings
    FOR ALL
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.lesson_ratings TO anon, authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
