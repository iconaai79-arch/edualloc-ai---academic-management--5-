-- 288. FIX STUDENT ENROLLMENTS FOREIGN KEY CONSTRAINT ON UPDATE
-- Ensures ON UPDATE CASCADE is set for student_enrollments_user_id_fkey so updates on users table don't break foreign key constraints.

DO $$
BEGIN
    -- Update student_enrollments constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'student_enrollments_user_id_fkey'
        AND table_name = 'student_enrollments'
    ) THEN
        ALTER TABLE public.student_enrollments 
        DROP CONSTRAINT student_enrollments_user_id_fkey;

        ALTER TABLE public.student_enrollments 
        ADD CONSTRAINT student_enrollments_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
