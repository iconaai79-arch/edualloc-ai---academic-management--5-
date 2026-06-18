-- Migration: Create EduFlow Tasks & Comments Tables
-- Path: database/migrations/233_create_eduflow_tables.sql

CREATE TABLE IF NOT EXISTS public.eduflow_tasks (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'completed'
    priority TEXT NOT NULL DEFAULT 'Normal', -- 'Low', 'Normal', 'High', 'Urgent'
    due_date TIMESTAMP WITH TIME ZONE,
    cohort_id TEXT, -- gradeLevel or licenseCategory
    subject_id TEXT, -- linked course subject
    parent_task_id TEXT REFERENCES public.eduflow_tasks(id) ON DELETE CASCADE, -- subtask linking
    checklists JSONB DEFAULT '[]'::jsonb, -- e.g., [{"id":"1","text":"Read book","isDone":false}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.eduflow_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES public.eduflow_tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for tasks and comments
ALTER TABLE public.eduflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eduflow_comments ENABLE ROW LEVEL SECURITY;

-- Apply institutional tenancy select & manage policies
DO $$
DECLARE
    tables text[] := ARRAY['eduflow_tasks', 'eduflow_comments'];
    t text;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy select: %I" ON public.%I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
        
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy manage: %I" ON public.%I FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
        
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;
