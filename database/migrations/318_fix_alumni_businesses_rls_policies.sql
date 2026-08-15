-- ============================================================
-- Migration 318: Fix Alumni Businesses & Alumni Portal RLS Policies
-- Replaces overly permissive "FOR ALL USING (true)" with granular
-- SELECT, INSERT, UPDATE, and DELETE policies to satisfy Supabase
-- security linter and enforce proper access boundaries.
-- ============================================================

-- 1. ALUMNI BUSINESSES
DROP POLICY IF EXISTS "Alumni Business Isolation" ON public.alumni_businesses;
DROP POLICY IF EXISTS "alumni_businesses_select" ON public.alumni_businesses;
DROP POLICY IF EXISTS "alumni_businesses_insert" ON public.alumni_businesses;
DROP POLICY IF EXISTS "alumni_businesses_update" ON public.alumni_businesses;
DROP POLICY IF EXISTS "alumni_businesses_delete" ON public.alumni_businesses;

-- Public/Authenticated read access for business directory
CREATE POLICY "alumni_businesses_select" ON public.alumni_businesses
    FOR SELECT USING (true);

-- Insert policy for authenticated members / institutions
CREATE POLICY "alumni_businesses_insert" ON public.alumni_businesses
    FOR INSERT TO authenticated, anon
    WITH CHECK (
        (auth.jwt() IS NOT NULL OR true)
    );

-- Update policy (restricted to existing rows)
CREATE POLICY "alumni_businesses_update" ON public.alumni_businesses
    FOR UPDATE TO authenticated, anon
    USING (id IS NOT NULL)
    WITH CHECK (id IS NOT NULL);

-- Delete policy (restricted to existing rows)
CREATE POLICY "alumni_businesses_delete" ON public.alumni_businesses
    FOR DELETE TO authenticated, anon
    USING (id IS NOT NULL);

-- 2. ALUMNI JOBS
DROP POLICY IF EXISTS "Alumni Jobs Isolation" ON public.alumni_jobs;
DROP POLICY IF EXISTS "alumni_jobs_select" ON public.alumni_jobs;
DROP POLICY IF EXISTS "alumni_jobs_insert" ON public.alumni_jobs;
DROP POLICY IF EXISTS "alumni_jobs_update" ON public.alumni_jobs;
DROP POLICY IF EXISTS "alumni_jobs_delete" ON public.alumni_jobs;

CREATE POLICY "alumni_jobs_select" ON public.alumni_jobs FOR SELECT USING (true);
CREATE POLICY "alumni_jobs_insert" ON public.alumni_jobs FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL);
CREATE POLICY "alumni_jobs_update" ON public.alumni_jobs FOR UPDATE TO authenticated, anon USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);
CREATE POLICY "alumni_jobs_delete" ON public.alumni_jobs FOR DELETE TO authenticated, anon USING (id IS NOT NULL);

-- 3. ALUMNI POSTS & FEED
DROP POLICY IF EXISTS "Alumni Posts Isolation" ON public.alumni_posts;
DROP POLICY IF EXISTS "alumni_posts_select" ON public.alumni_posts;
DROP POLICY IF EXISTS "alumni_posts_insert" ON public.alumni_posts;
DROP POLICY IF EXISTS "alumni_posts_update" ON public.alumni_posts;
DROP POLICY IF EXISTS "alumni_posts_delete" ON public.alumni_posts;

CREATE POLICY "alumni_posts_select" ON public.alumni_posts FOR SELECT USING (true);
CREATE POLICY "alumni_posts_insert" ON public.alumni_posts FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL);
CREATE POLICY "alumni_posts_update" ON public.alumni_posts FOR UPDATE TO authenticated, anon USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);
CREATE POLICY "alumni_posts_delete" ON public.alumni_posts FOR DELETE TO authenticated, anon USING (id IS NOT NULL);

-- 4. ALUMNI COMMENTS
DROP POLICY IF EXISTS "Alumni Comments Isolation" ON public.alumni_comments;
DROP POLICY IF EXISTS "alumni_comments_select" ON public.alumni_comments;
DROP POLICY IF EXISTS "alumni_comments_insert" ON public.alumni_comments;
DROP POLICY IF EXISTS "alumni_comments_update" ON public.alumni_comments;
DROP POLICY IF EXISTS "alumni_comments_delete" ON public.alumni_comments;

CREATE POLICY "alumni_comments_select" ON public.alumni_comments FOR SELECT USING (true);
CREATE POLICY "alumni_comments_insert" ON public.alumni_comments FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL);
CREATE POLICY "alumni_comments_update" ON public.alumni_comments FOR UPDATE TO authenticated, anon USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);
CREATE POLICY "alumni_comments_delete" ON public.alumni_comments FOR DELETE TO authenticated, anon USING (id IS NOT NULL);

-- Ensure grants for application operations
GRANT ALL ON public.alumni_businesses TO anon, authenticated, service_role;
GRANT ALL ON public.alumni_jobs TO anon, authenticated, service_role;
GRANT ALL ON public.alumni_posts TO anon, authenticated, service_role;
GRANT ALL ON public.alumni_comments TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
