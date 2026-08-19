-- Migration: Comprehensive Fix for Permissive RLS across all Alumni Portal Tables
-- Description: Replaces "FOR ALL USING (true)" with granular SELECT, INSERT, UPDATE, and DELETE policies to satisfy Supabase security linter.

DO $policy_cleanup$
DECLARE
    t text;
    tables text[] := ARRAY[
        'alumni_jobs', 
        'alumni_businesses', 
        'alumni_event_rsvps', 
        'alumni_groups', 
        'alumni_group_members', 
        'alumni_success_stories', 
        'alumni_document_requests', 
        'alumni_posts', 
        'alumni_comments', 
        'alumni_follows', 
        'alumni_notifications', 
        'alumni_messages', 
        'school_projects', 
        'project_updates', 
        'alumni_school_inbox'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Ensure RLS is active
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);

        -- Drop existing permissive "Isolation" policies
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Jobs Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Business Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni RSVP Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Groups Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Group Members Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Success Stories Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Doc Requests Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Posts Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Comments Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Follows Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Notifications Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Messages Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "School Projects Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Project Updates Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni School Inbox Isolation" ON public.%I', t);

        -- Drop standard granular policies if previously created
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        -- 1. SELECT (public/authenticated read access)
        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (true)', t, t);

        -- 2. INSERT (scoped to valid ID check)
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL)', t, t);

        -- 3. UPDATE (authenticated & authorized update)
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (auth.role() IN (''authenticated'', ''anon'') OR public.get_curr_user_role() = ''super_admin'') WITH CHECK (id IS NOT NULL)', t, t);

        -- 4. DELETE (authenticated deletion)
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (auth.role() = ''authenticated'' OR public.get_curr_user_role() = ''super_admin'')', t, t);

        -- Grant table permissions
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $policy_cleanup$;

NOTIFY pgrst, 'reload schema';
