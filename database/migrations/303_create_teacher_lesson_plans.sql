-- Migration 303: Create teacher_lesson_plans and schemes_of_work tables
-- Enables AI-powered CBC/8-4-4 lesson plan generation, termly schemes of work matrix, HOD approval workflow, and PDF printing.

CREATE TABLE IF NOT EXISTS public.teacher_lesson_plans (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    subject_id TEXT,
    subject_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT,
    duration INTEGER DEFAULT 40, -- minutes
    learning_outcomes JSONB DEFAULT '[]'::jsonb,
    key_questions JSONB DEFAULT '[]'::jsonb,
    core_competencies JSONB DEFAULT '[]'::jsonb,
    learning_resources JSONB DEFAULT '[]'::jsonb,
    lesson_trajectory JSONB DEFAULT '{}'::jsonb, -- { intro: "", development: "", conclusion: "" }
    reflection TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'revision_requested'
    hod_comment TEXT,
    institution_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.schemes_of_work (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    subject_id TEXT,
    subject_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    term TEXT NOT NULL DEFAULT 'Term 1',
    academic_year TEXT,
    weeks_data JSONB DEFAULT '[]'::jsonb, -- array of { weekNumber, lessonNumber, strand, subStrand, outcomes, experiences, resources, assessment, remarks }
    status TEXT NOT NULL DEFAULT 'draft',
    institution_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_lesson_plans_teacher ON public.teacher_lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_lesson_plans_inst ON public.teacher_lesson_plans(institution_id);
CREATE INDEX IF NOT EXISTS idx_schemes_of_work_inst ON public.schemes_of_work(institution_id);

-- RLS Policies
ALTER TABLE public.teacher_lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schemes_of_work ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on teacher_lesson_plans" ON public.teacher_lesson_plans;
CREATE POLICY "Allow public read on teacher_lesson_plans" ON public.teacher_lesson_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated all on teacher_lesson_plans" ON public.teacher_lesson_plans;
CREATE POLICY "Allow authenticated all on teacher_lesson_plans" ON public.teacher_lesson_plans FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read on schemes_of_work" ON public.schemes_of_work;
CREATE POLICY "Allow public read on schemes_of_work" ON public.schemes_of_work FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated all on schemes_of_work" ON public.schemes_of_work;
CREATE POLICY "Allow authenticated all on schemes_of_work" ON public.schemes_of_work FOR ALL USING (true);

GRANT ALL ON public.teacher_lesson_plans TO anon, authenticated, service_role;
GRANT ALL ON public.schemes_of_work TO anon, authenticated, service_role;
