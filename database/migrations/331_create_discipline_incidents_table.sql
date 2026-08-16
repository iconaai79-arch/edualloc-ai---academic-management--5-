-- Migration 331: Create discipline_incidents table
-- Description: Stores student disciplinary records, violation types, severity, descriptions, actions taken, and resolution statuses.

CREATE TABLE IF NOT EXISTS public.discipline_incidents (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT,
    student_name TEXT,
    type TEXT,
    incident_type TEXT,
    severity TEXT DEFAULT 'Medium',
    description TEXT NOT NULL,
    action_taken TEXT,
    status TEXT DEFAULT 'pending',
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    recorded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure text types if previously created as UUID
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'discipline_incidents' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.discipline_incidents ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'discipline_incidents' 
          AND column_name = 'institution_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.discipline_incidents ALTER COLUMN institution_id TYPE TEXT USING institution_id::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'discipline_incidents' 
          AND column_name = 'student_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.discipline_incidents ALTER COLUMN student_id TYPE TEXT USING student_id::TEXT;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_disc_incidents_inst ON public.discipline_incidents(institution_id);
CREATE INDEX IF NOT EXISTS idx_disc_incidents_student ON public.discipline_incidents(student_id);
CREATE INDEX IF NOT EXISTS idx_disc_incidents_status ON public.discipline_incidents(status);
CREATE INDEX IF NOT EXISTS idx_disc_incidents_date ON public.discipline_incidents(timestamp DESC);

-- Enable RLS
ALTER TABLE public.discipline_incidents ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies
DROP POLICY IF EXISTS "discipline_incidents_all_access" ON public.discipline_incidents;
CREATE POLICY "discipline_incidents_all_access" ON public.discipline_incidents
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant privileges
GRANT ALL ON public.discipline_incidents TO anon, authenticated, service_role;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
