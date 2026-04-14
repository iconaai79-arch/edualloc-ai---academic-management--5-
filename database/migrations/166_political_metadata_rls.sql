-- 166_political_metadata_rls.sql
-- Enable RLS and define access policies for Kenyan administrative units and political metadata

-- 1. Enable RLS on all related tables
ALTER TABLE IF EXISTS public.political_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wards ENABLE ROW LEVEL SECURITY;

-- 2. Grant permissions to standard roles
GRANT ALL ON public.political_parties TO anon, authenticated, service_role;
GRANT ALL ON public.constituencies TO anon, authenticated, service_role;
GRANT ALL ON public.wards TO anon, authenticated, service_role;

-- 3. SELECT Policies (Publicly readable for discovery and registration)
DROP POLICY IF EXISTS "Political parties read access" ON public.political_parties;
CREATE POLICY "Political parties read access"
    ON public.political_parties FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Constituencies read access" ON public.constituencies;
CREATE POLICY "Constituencies read access"
    ON public.constituencies FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Wards accessibility" ON public.wards;
CREATE POLICY "Wards accessibility"
    ON public.wards FOR SELECT
    USING (true);

-- 4. MANAGE Policies (Restricted to Super Admins)
DROP POLICY IF EXISTS "Super Admins manage political parties" ON public.political_parties;
CREATE POLICY "Super Admins manage political parties"
    ON public.political_parties FOR ALL
    USING (public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Super Admins manage constituencies" ON public.constituencies;
CREATE POLICY "Super Admins manage constituencies"
    ON public.constituencies FOR ALL
    USING (public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Super Admins manage wards" ON public.wards;
CREATE POLICY "Super Admins manage wards"
    ON public.wards FOR ALL
    USING (public.get_curr_user_role() = 'super_admin');
