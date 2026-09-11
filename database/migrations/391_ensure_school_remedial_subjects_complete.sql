-- Migration: 391_ensure_school_remedial_subjects_complete.sql
-- Purpose: Fully ensure school_remedial_subjects schema includes all columns, priorities, frequencies, metadata, and indexes.

CREATE TABLE IF NOT EXISTS public.school_remedial_subjects (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    subject_id TEXT,
    subject_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    priority TEXT DEFAULT 'Medium',
    weekly_occurrences INTEGER DEFAULT 1,
    preferred_day_type TEXT DEFAULT 'any',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on existing tables
ALTER TABLE public.school_remedial_subjects
    ADD COLUMN IF NOT EXISTS subject_id TEXT,
    ADD COLUMN IF NOT EXISTS subject_name TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS weekly_occurrences INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS preferred_day_type TEXT DEFAULT 'any',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS and permissive policies
ALTER TABLE public.school_remedial_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select for school_remedial_subjects" ON public.school_remedial_subjects;
CREATE POLICY "Allow authenticated select for school_remedial_subjects" 
    ON public.school_remedial_subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update for school_remedial_subjects" ON public.school_remedial_subjects;
CREATE POLICY "Allow authenticated insert/update for school_remedial_subjects" 
    ON public.school_remedial_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow public/anon access if used with anon key
DROP POLICY IF EXISTS "Allow anon all for school_remedial_subjects" ON public.school_remedial_subjects;
CREATE POLICY "Allow anon all for school_remedial_subjects" 
    ON public.school_remedial_subjects FOR ALL TO anon USING (true) WITH CHECK (true);

-- Ensure table permissions for all roles
GRANT ALL ON TABLE public.school_remedial_subjects TO anon, authenticated, service_role;

-- Create indexes for ultra-fast lookup and sorting
CREATE INDEX IF NOT EXISTS idx_school_remedial_subjects_inst 
    ON public.school_remedial_subjects (institution_id);

CREATE INDEX IF NOT EXISTS idx_school_remedial_subjects_inst_sub 
    ON public.school_remedial_subjects (institution_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_school_remedial_subjects_active 
    ON public.school_remedial_subjects (institution_id, is_active);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
