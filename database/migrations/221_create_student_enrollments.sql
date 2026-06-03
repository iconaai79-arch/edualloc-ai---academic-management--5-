-- 221. CREATE STUDENT ENROLLMENTS TABLE
-- Adds a unified polymorphic table to manage student enrollments across Academic and Driving School modules.

CREATE TABLE IF NOT EXISTS student_enrollments (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrollment_type TEXT NOT NULL, -- 'academic' or 'driving_school'
    admission_number TEXT,
    status TEXT DEFAULT 'Enrolled', -- 'Enrolled', 'Active', 'Graduated', 'Suspended', 'Dropped'
    enrollment_date TEXT, -- Store dates as ISO strings to align with local storage
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for student_enrollments
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;

-- Apply standard dynamic RLS policies
DO $$
DECLARE
    t text := 'student_enrollments';
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Institutional tenancy select: %I" ON %I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Institutional tenancy manage: %I" ON %I FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
    
    EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
END $$;
