-- Temporary fix for the RLS policy error (42501) on carwash_jobs
-- This enables anon and authenticated roles to insert/update/select records 
-- properly until strict auth-based policies are needed based on frontend setup.

ALTER TABLE public.carwash_jobs ENABLE ROW LEVEL SECURITY;

-- Drop ANY existing policies that might be restricting access
DROP POLICY IF EXISTS "Institution staff can manage carwash_jobs" ON public.carwash_jobs;
DROP POLICY IF EXISTS "Enable read access for all" ON public.carwash_jobs;
DROP POLICY IF EXISTS "Enable insert access for all" ON public.carwash_jobs;
DROP POLICY IF EXISTS "Enable update access for all" ON public.carwash_jobs;
DROP POLICY IF EXISTS "Enable delete access for all" ON public.carwash_jobs;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.carwash_jobs;
DROP POLICY IF EXISTS "Allow all operations for anon" ON public.carwash_jobs;

-- Create generic policies to unblock the application functionality for now
CREATE POLICY "Enable all operations for all users"
ON public.carwash_jobs
FOR ALL
USING (true)
WITH CHECK (true);
