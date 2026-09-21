-- Migration 410: Ensure teacher_lesson_plans table and trajectory columns are fully synchronized
-- Prevents schema cache stale errors for both 'trajectory' and 'lesson_trajectory'.

CREATE TABLE IF NOT EXISTS public.teacher_lesson_plans (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    subject_id TEXT,
    subject_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT,
    duration INTEGER DEFAULT 40,
    learning_outcomes JSONB DEFAULT '[]'::jsonb,
    key_questions JSONB DEFAULT '[]'::jsonb,
    core_competencies JSONB DEFAULT '[]'::jsonb,
    learning_resources JSONB DEFAULT '[]'::jsonb,
    lesson_trajectory JSONB DEFAULT '{}'::jsonb,
    trajectory JSONB DEFAULT '{}'::jsonb,
    reflection TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    hod_comment TEXT,
    institution_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- In case table already exists with only lesson_trajectory, ensure both columns exist
ALTER TABLE public.teacher_lesson_plans ADD COLUMN IF NOT EXISTS trajectory JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.teacher_lesson_plans ADD COLUMN IF NOT EXISTS lesson_trajectory JSONB DEFAULT '{}'::jsonb;

-- Sync data bidirectionally between trajectory and lesson_trajectory
UPDATE public.teacher_lesson_plans 
SET trajectory = lesson_trajectory 
WHERE (trajectory IS NULL OR trajectory = '{}'::jsonb) AND lesson_trajectory IS NOT NULL AND lesson_trajectory != '{}'::jsonb;

UPDATE public.teacher_lesson_plans 
SET lesson_trajectory = trajectory 
WHERE (lesson_trajectory IS NULL OR lesson_trajectory = '{}'::jsonb) AND trajectory IS NOT NULL AND trajectory != '{}'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_lesson_plans_teacher ON public.teacher_lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_lesson_plans_inst ON public.teacher_lesson_plans(institution_id);

-- RLS Policies
ALTER TABLE public.teacher_lesson_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on teacher_lesson_plans" ON public.teacher_lesson_plans;
CREATE POLICY "Allow public read on teacher_lesson_plans" ON public.teacher_lesson_plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated all on teacher_lesson_plans" ON public.teacher_lesson_plans;
CREATE POLICY "Allow authenticated all on teacher_lesson_plans" ON public.teacher_lesson_plans FOR ALL USING (true);

GRANT ALL ON public.teacher_lesson_plans TO anon, authenticated, service_role;
