-- Migration: Create EduFlow Shared Files Table
-- Path: database/migrations/234_create_eduflow_files.sql

CREATE TABLE IF NOT EXISTS public.eduflow_files (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    task_id TEXT REFERENCES public.eduflow_tasks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    uploaded_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    cohort_id TEXT, -- gradeLevel or licenseCategory
    subject_id TEXT, -- linked course subject ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.eduflow_files ENABLE ROW LEVEL SECURITY;

-- Apply institutional tenancy policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'eduflow_files' 
        AND policyname = 'Institutional tenancy select: eduflow_files'
    ) THEN
        CREATE POLICY "Institutional tenancy select: eduflow_files" 
        ON public.eduflow_files FOR SELECT 
        USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'eduflow_files' 
        AND policyname = 'Institutional tenancy manage: eduflow_files'
    ) THEN
        CREATE POLICY "Institutional tenancy manage: eduflow_files" 
        ON public.eduflow_files FOR ALL 
        USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');
    END IF;
END $$;

-- Grant access permissions
GRANT ALL ON public.eduflow_files TO anon, authenticated, service_role;
