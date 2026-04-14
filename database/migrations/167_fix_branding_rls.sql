-- 167_fix_branding_rls.sql
-- Enable RLS and define policies for branding price settings

-- 1. Enable RLS
ALTER TABLE IF EXISTS public.branding_price_settings ENABLE ROW LEVEL SECURITY;

-- 2. Grant permissions
GRANT ALL ON public.branding_price_settings TO anon, authenticated, service_role;

-- 3. SELECT Policy: Everyone can see the prices and features
DROP POLICY IF EXISTS "branding_price_settings_read" ON public.branding_price_settings;
CREATE POLICY "branding_price_settings_read"
    ON public.branding_price_settings FOR SELECT
    USING (true);

-- 4. MANAGE Policy: Only Super Admins can change prices
DROP POLICY IF EXISTS "branding_price_settings_manage" ON public.branding_price_settings;
CREATE POLICY "branding_price_settings_manage"
    ON public.branding_price_settings FOR ALL
    USING (public.get_curr_user_role() = 'super_admin');
