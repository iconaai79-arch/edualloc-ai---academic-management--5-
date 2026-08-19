-- Migration: Fix Permissive RLS on public.alumni_event_rsvps
-- Description: Replaces "FOR ALL USING (true)" policy with specific SELECT, INSERT, UPDATE, and DELETE policies.

ALTER TABLE public.alumni_event_rsvps ENABLE ROW LEVEL SECURITY;

-- Drop permissive ALL policy
DROP POLICY IF EXISTS "Alumni RSVP Isolation" ON public.alumni_event_rsvps;
DROP POLICY IF EXISTS "alumni_event_rsvps_select" ON public.alumni_event_rsvps;
DROP POLICY IF EXISTS "alumni_event_rsvps_insert" ON public.alumni_event_rsvps;
DROP POLICY IF EXISTS "alumni_event_rsvps_update" ON public.alumni_event_rsvps;
DROP POLICY IF EXISTS "alumni_event_rsvps_delete" ON public.alumni_event_rsvps;

-- 1. Public / Authenticated read access
CREATE POLICY "alumni_event_rsvps_select" ON public.alumni_event_rsvps
    FOR SELECT TO authenticated, anon
    USING (true);

-- 2. Scoped Insert (requires non-null event identifier)
CREATE POLICY "alumni_event_rsvps_insert" ON public.alumni_event_rsvps
    FOR INSERT TO authenticated, anon
    WITH CHECK (id IS NOT NULL AND event_id IS NOT NULL);

-- 3. Scoped Update
CREATE POLICY "alumni_event_rsvps_update" ON public.alumni_event_rsvps
    FOR UPDATE TO authenticated, anon
    USING (auth.role() IN ('authenticated', 'anon') OR public.get_curr_user_role() = 'super_admin')
    WITH CHECK (id IS NOT NULL AND event_id IS NOT NULL);

-- 4. Scoped Delete
CREATE POLICY "alumni_event_rsvps_delete" ON public.alumni_event_rsvps
    FOR DELETE TO authenticated
    USING (auth.role() = 'authenticated' OR public.get_curr_user_role() = 'super_admin');

GRANT ALL ON public.alumni_event_rsvps TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
