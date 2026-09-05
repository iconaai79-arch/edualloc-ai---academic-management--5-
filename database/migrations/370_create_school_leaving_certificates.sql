-- Migration 370: Create school_leaving_certificates table for official leaving certificates registry
-- Supports JSS CBC Transition, Primary (KPSEA/KCPE), and Secondary (KCSE) templates

CREATE TABLE IF NOT EXISTS public.school_leaving_certificates (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT,
    certificate_no TEXT NOT NULL,
    assessment_no TEXT,
    template_type TEXT NOT NULL DEFAULT 'jss',
    student_name TEXT NOT NULL,
    admission_no TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    headteacher_name TEXT,
    issue_date TEXT,
    status TEXT DEFAULT 'issued',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for rapid lookup by institution and serial number
CREATE INDEX IF NOT EXISTS idx_school_leaving_certificates_institution 
    ON public.school_leaving_certificates(institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_school_leaving_certificates_serial 
    ON public.school_leaving_certificates(institution_id, certificate_no);

CREATE INDEX IF NOT EXISTS idx_school_leaving_certificates_student 
    ON public.school_leaving_certificates(institution_id, student_id);

-- Enable RLS
ALTER TABLE public.school_leaving_certificates ENABLE ROW LEVEL SECURITY;

-- Select Policy
DROP POLICY IF EXISTS "Users can view their institution''s school_leaving_certificates" ON public.school_leaving_certificates;
CREATE POLICY "Users can view their institution''s school_leaving_certificates"
    ON public.school_leaving_certificates FOR SELECT
    USING (
        institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    );

-- Insert/Update/Delete Policy
DROP POLICY IF EXISTS "Admins/Officers can manage their institution''s school_leaving_certificates" ON public.school_leaving_certificates;
CREATE POLICY "Admins/Officers can manage their institution''s school_leaving_certificates"
    ON public.school_leaving_certificates FOR ALL
    USING (
        institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    );

GRANT ALL ON TABLE public.school_leaving_certificates TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
