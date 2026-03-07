-- 054_restore_absence_requests_rls.sql
-- Restores and hardens RLS for staff and student absence requests with Super Admin bypass.

-- ==========================================
-- 1. STAFF ABSENCE REQUESTS (No institution_id)
-- ==========================================
ALTER TABLE public.absence_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecturers can view their own absence requests" ON public.absence_requests;
DROP POLICY IF EXISTS "Admins can view institution absence requests" ON public.absence_requests;
DROP POLICY IF EXISTS "Lecturers can create their own absence requests" ON public.absence_requests;
DROP POLICY IF EXISTS "Admins can update absence requests" ON public.absence_requests;
DROP POLICY IF EXISTS "Users can delete their own pending absence requests" ON public.absence_requests;
DROP POLICY IF EXISTS "Staff absence visibility" ON public.absence_requests;
DROP POLICY IF EXISTS "Staff absence management" ON public.absence_requests;

-- SELECT: Super Admin OR Self OR Admin in same institution
CREATE POLICY "Staff absence visibility"
    ON public.absence_requests
    FOR SELECT
    USING (
        (public.get_curr_user_role() = 'super_admin')
        OR (lecturer_id::text = auth.uid()::text OR lecturer_id::text = 'u_' || auth.uid()::text)
        OR (
            public.get_curr_user_role() IN ('admin', 'head_teacher', 'hod')
            AND (SELECT u.institution_id FROM public.users u WHERE u.id = public.absence_requests.lecturer_id::text) = public.get_curr_user_inst_id()
        )
    );

-- ALL (Manage): Super Admin OR Self (Insert/Update pending) OR Admin (Update status)
CREATE POLICY "Staff absence management"
    ON public.absence_requests
    FOR ALL
    USING (
        (public.get_curr_user_role() = 'super_admin')
        OR (lecturer_id::text = auth.uid()::text OR lecturer_id::text = 'u_' || auth.uid()::text)
        OR (
            public.get_curr_user_role() IN ('admin', 'head_teacher', 'hod')
            AND (SELECT u.institution_id FROM public.users u WHERE u.id = public.absence_requests.lecturer_id::text) = public.get_curr_user_inst_id()
        )
    );

-- ==========================================
-- 2. STUDENT ABSENCE REQUESTS (Has institution_id)
-- ==========================================
ALTER TABLE public.student_absence_requests ENABLE ROW LEVEL SECURITY;

-- Drop automated policies if they exist from 053/049
DROP POLICY IF EXISTS "Institutional tenancy select: student_absence_requests" ON public.student_absence_requests;
DROP POLICY IF EXISTS "Institutional tenancy manage: student_absence_requests" ON public.student_absence_requests;
DROP POLICY IF EXISTS "Students can view their own absence requests" ON public.student_absence_requests;
DROP POLICY IF EXISTS "Admins can view all student absence requests" ON public.student_absence_requests;
DROP POLICY IF EXISTS "Students/Parents can create absence requests" ON public.student_absence_requests;
DROP POLICY IF EXISTS "Admins can update student absence requests" ON public.student_absence_requests;
DROP POLICY IF EXISTS "Users can delete pending student_absence_requests" ON public.student_absence_requests;

-- SELECT: Super Admin OR Self OR Parent OR Staff in same institution
CREATE POLICY "Student absence visibility"
    ON public.student_absence_requests
    FOR SELECT
    USING (
        (public.get_curr_user_role() = 'super_admin')
        OR (student_id::text = auth.uid()::text OR student_id::text = 'u_' || auth.uid()::text)
        OR (institution_id::text = public.get_curr_user_inst_id())
    );

-- ALL (Manage): Super Admin OR Self (Insert/Update pending) OR Parent OR Admin
-- Note: 'USING' applies to SELECT/UPDATE/DELETE. 'WITH CHECK' applies to INSERT/UPDATE.
CREATE POLICY "Student absence management"
    ON public.student_absence_requests
    FOR ALL
    USING (
        (public.get_curr_user_role() = 'super_admin')
        OR (student_id::text = auth.uid()::text OR student_id::text = 'u_' || auth.uid()::text)
        OR (
            institution_id::text = public.get_curr_user_inst_id()
            AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'parent', 'teacher')
        )
    );

DO $$ BEGIN
    RAISE NOTICE 'Absence Request RLS restored with Super Admin support.';
END $$;
