-- 072_create_leave_out_requests.sql
-- Creates the leave_out_requests table for student permission sheet generation
-- and configures permissive RLS policies.

CREATE TABLE IF NOT EXISTS public.leave_out_requests (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    class_teacher_id TEXT NOT NULL,
    boarding_master_id TEXT,
    security_id TEXT,
    reason TEXT NOT NULL,
    leave_date DATE NOT NULL,
    return_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_boarding' CHECK (
        status IN ('pending_boarding', 'pending_security', 'checked_out', 'cancelled')
    ),
    house_checked_out_at TIMESTAMP,
    gate_checked_out_at TIMESTAMP,
    home_arrival_at TIMESTAMP,
    home_departure_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_out_institution ON public.leave_out_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_leave_out_student ON public.leave_out_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_out_status ON public.leave_out_requests(status);

-- Enable RLS
ALTER TABLE public.leave_out_requests ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'leave_out_requests' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.leave_out_requests', pol.policyname);
    END LOOP;
END $$;

-- Permissive policy: any authenticated user from same institution can do all operations
CREATE POLICY leave_out_requests_authenticated
    ON public.leave_out_requests
    FOR ALL
    TO authenticated
    USING (institution_id = public.get_curr_user_inst_id())
    WITH CHECK (institution_id = public.get_curr_user_inst_id());

-- Super admin: unrestricted access
CREATE POLICY leave_out_requests_super_admin
    ON public.leave_out_requests
    FOR ALL
    USING (public.get_curr_user_role() = 'super_admin');
