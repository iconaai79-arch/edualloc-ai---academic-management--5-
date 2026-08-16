-- Migration 332: Ensure teacher_check_ins table and view
-- Description: Creates/standardizes teacher_check_ins with TEXT IDs, syncs legacy teacher_checkins data if present, creates v_today_teacher_checkins view, and reloads schema cache.

-- 1. Create table teacher_check_ins
CREATE TABLE IF NOT EXISTS public.teacher_check_ins (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
    morning_check_in_time TEXT,
    morning_check_in_status TEXT DEFAULT 'Pending',
    morning_location TEXT,
    morning_notes TEXT,
    afternoon_check_in_time TEXT,
    afternoon_check_in_status TEXT DEFAULT 'Pending',
    afternoon_location TEXT,
    afternoon_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_teacher_check_in_date UNIQUE(teacher_id, check_in_date)
);

-- Ensure text types and columns exist
ALTER TABLE public.teacher_check_ins ADD COLUMN IF NOT EXISTS morning_check_in_time TEXT;
ALTER TABLE public.teacher_check_ins ADD COLUMN IF NOT EXISTS morning_check_in_status TEXT DEFAULT 'Pending';
ALTER TABLE public.teacher_check_ins ADD COLUMN IF NOT EXISTS morning_location TEXT;
ALTER TABLE public.teacher_check_ins ADD COLUMN IF NOT EXISTS morning_notes TEXT;
ALTER TABLE public.teacher_check_ins ADD COLUMN IF NOT EXISTS afternoon_check_in_time TEXT;
ALTER TABLE public.teacher_check_ins ADD COLUMN IF NOT EXISTS afternoon_check_in_status TEXT DEFAULT 'Pending';
ALTER TABLE public.teacher_check_ins ADD COLUMN IF NOT EXISTS afternoon_location TEXT;
ALTER TABLE public.teacher_check_ins ADD COLUMN IF NOT EXISTS afternoon_notes TEXT;

-- If legacy teacher_checkins table exists, migrate data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teacher_checkins') THEN
        INSERT INTO public.teacher_check_ins (
            id, teacher_id, institution_id, check_in_date,
            morning_check_in_time, morning_check_in_status, morning_location, morning_notes,
            afternoon_check_in_time, afternoon_check_in_status, afternoon_location, afternoon_notes,
            created_at, updated_at
        )
        SELECT 
            id::TEXT, teacher_id::TEXT, institution_id::TEXT, check_in_date,
            morning_check_in_time::TEXT, morning_check_in_status::TEXT, morning_location, morning_notes,
            afternoon_check_in_time::TEXT, afternoon_check_in_status::TEXT, afternoon_location, afternoon_notes,
            created_at, updated_at
        FROM public.teacher_checkins
        ON CONFLICT (teacher_id, check_in_date) DO NOTHING;
    END IF;
END $$;

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_tch_chk_inst ON public.teacher_check_ins(institution_id);
CREATE INDEX IF NOT EXISTS idx_tch_chk_teacher ON public.teacher_check_ins(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tch_chk_date ON public.teacher_check_ins(check_in_date DESC);

-- 3. Enable RLS
ALTER TABLE public.teacher_check_ins ENABLE ROW LEVEL SECURITY;

-- 4. Permissive RLS Policies
DROP POLICY IF EXISTS "teacher_check_ins_all_access" ON public.teacher_check_ins;
CREATE POLICY "teacher_check_ins_all_access" ON public.teacher_check_ins
    FOR ALL
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.teacher_check_ins TO anon, authenticated, service_role;

-- 5. Standardize v_today_teacher_checkins view
CREATE OR REPLACE VIEW public.v_today_teacher_checkins
WITH (security_invoker = true) AS
SELECT 
    tc.id,
    tc.teacher_id,
    tc.institution_id,
    tc.check_in_date,
    tc.morning_check_in_time,
    tc.morning_check_in_status,
    tc.morning_location,
    tc.morning_notes,
    tc.afternoon_check_in_time,
    tc.afternoon_check_in_status,
    tc.afternoon_location,
    tc.afternoon_notes,
    tc.created_at,
    tc.updated_at,
    u.name as teacher_name,
    u.email as teacher_email,
    i.name as institution_name,
    CASE 
        WHEN tc.morning_check_in_time IS NULL AND CURRENT_TIME > '08:00:00' THEN true
        ELSE false
    END as morning_overdue,
    CASE 
        WHEN tc.afternoon_check_in_time IS NULL AND CURRENT_TIME > '16:00:00' THEN true
        ELSE false
    END as afternoon_overdue
FROM public.teacher_check_ins tc
JOIN public.users u ON tc.teacher_id = u.id
JOIN public.institutions i ON tc.institution_id = i.id
WHERE tc.check_in_date = CURRENT_DATE;

GRANT SELECT ON public.v_today_teacher_checkins TO anon, authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
