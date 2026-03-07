-- 048_absence_requests_rls.sql
-- Implement Row Level Security for staff and student absence requests.

-- 1. Enable RLS
ALTER TABLE public.absence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_absence_requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies for idempotency
DROP POLICY IF EXISTS "Lecturers can view their own absence requests" ON public.absence_requests;
DROP POLICY IF EXISTS "Admins can view institution absence requests" ON public.absence_requests;
DROP POLICY IF EXISTS "Lecturers can create their own absence requests" ON public.absence_requests;
DROP POLICY IF EXISTS "Admins can update absence requests" ON public.absence_requests;
DROP POLICY IF EXISTS "Users can delete their own pending absence requests" ON public.absence_requests;

DROP POLICY IF EXISTS "Students can view their own absence requests" ON public.student_absence_requests;
DROP POLICY IF EXISTS "Parents can view their student absence requests" ON public.student_absence_requests;
DROP POLICY IF EXISTS "Admins can view all student absence requests" ON public.student_absence_requests;
DROP POLICY IF EXISTS "Students/Parents can create absence requests" ON public.student_absence_requests;
DROP POLICY IF EXISTS "Admins can update student absence requests" ON public.student_absence_requests;
DROP POLICY IF EXISTS "Users can delete pending student absence requests" ON public.student_absence_requests;

-- ==========================================
-- POLICIES FOR absence_requests (Staff)
-- ==========================================

-- SELECT: Requesters see their own
CREATE POLICY "Lecturers can view their own absence requests"
    ON public.absence_requests
    FOR SELECT
    USING (auth.uid() = lecturer_id);

-- SELECT: Admins/HODs see all in institution
CREATE POLICY "Admins can view institution absence requests"
    ON public.absence_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'head_teacher', 'hod', 'super_admin')
            -- We need to join with subjects or timetable_entries to check institution_id?
            -- Actually, let's assume absence_requests should have an institution_id.
            -- Looking at sqlGenerator.ts, absence_requests DOES NOT have institution_id.
            -- It has lecturer_id, subject_id, timetable_entry_id.
            -- We'll check via the lecturer's institution.
            AND u.institution_id = (SELECT inst.institution_id FROM public.users inst WHERE inst.id = public.absence_requests.lecturer_id)
        )
    );

-- INSERT: Lecturers can create for themselves
CREATE POLICY "Lecturers can create their own absence requests"
    ON public.absence_requests
    FOR INSERT
    WITH CHECK (auth.uid() = lecturer_id);

-- UPDATE: Admins can update status, Requesters can update if pending
CREATE POLICY "Admins can update absence requests"
    ON public.absence_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND (
                u.role IN ('admin', 'head_teacher', 'hod', 'super_admin')
                OR (u.id = public.absence_requests.lecturer_id AND public.absence_requests.status = 'pending')
            )
        )
    );

-- DELETE: Requesters can delete if pending
CREATE POLICY "Users can delete their own pending absence requests"
    ON public.absence_requests
    FOR DELETE
    USING (auth.uid() = lecturer_id AND status = 'pending');


-- ==========================================
-- POLICIES FOR student_absence_requests
-- ==========================================

-- SELECT: Students can view their own
CREATE POLICY "Students can view their own absence requests"
    ON public.student_absence_requests
    FOR SELECT
    USING (auth.uid() = student_id);

-- SELECT: Admins can view all in institution
CREATE POLICY "Admins can view all student absence requests"
    ON public.student_absence_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND (
                u.role IN ('admin', 'head_teacher', 'super_admin', 'teacher')
                AND u.institution_id = public.student_absence_requests.institution_id
            )
        )
    );

-- INSERT: Authorized users can create
CREATE POLICY "Students/Parents can create absence requests"
    ON public.student_absence_requests
    FOR INSERT
    WITH CHECK (
        auth.uid() = student_id 
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND (
                u.role IN ('admin', 'head_teacher', 'parent', 'super_admin')
                AND u.institution_id = public.student_absence_requests.institution_id
            )
        )
    );

-- UPDATE: Admins can update status
CREATE POLICY "Admins can update student absence requests"
    ON public.student_absence_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'head_teacher', 'super_admin')
            AND u.institution_id = public.student_absence_requests.institution_id
        )
    );

-- DELETE: Requesters can delete if pending
CREATE POLICY "Users can delete pending student_absence_requests"
    ON public.student_absence_requests
    FOR DELETE
    USING (
        (auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')))
        AND status = 'pending'
    );
