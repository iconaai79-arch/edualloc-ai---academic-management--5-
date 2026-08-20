-- Create student_subject_exemptions table for storing CBC / 8-4-4 subject exemption matrix
CREATE TABLE IF NOT EXISTS public.student_subject_exemptions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    institution_id TEXT NOT NULL,
    key TEXT NOT NULL,
    student_id TEXT,
    subject_id TEXT,
    class_name TEXT,
    is_exempted BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_student_subject_exemptions_inst ON public.student_subject_exemptions(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_subject_exemptions_key ON public.student_subject_exemptions(key);

-- Enable Row Level Security
ALTER TABLE public.student_subject_exemptions ENABLE ROW LEVEL SECURITY;

-- Public service access policy (with idempotent drop)
DROP POLICY IF EXISTS "Allow all operations on student_subject_exemptions" ON public.student_subject_exemptions;
CREATE POLICY "Allow all operations on student_subject_exemptions"
ON public.student_subject_exemptions
FOR ALL
USING (true)
WITH CHECK (true);
