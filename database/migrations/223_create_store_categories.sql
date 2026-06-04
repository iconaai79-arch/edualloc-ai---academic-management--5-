-- 223. CREATE STORE CATEGORIES TABLE
-- Stores inventory categories for school store/retail module.

CREATE TABLE IF NOT EXISTS store_categories (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for store_categories
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;

-- Apply standard dynamic RLS policies
DO $$
DECLARE
    t text := 'store_categories';
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Institutional tenancy select: %I" ON %I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Institutional tenancy manage: %I" ON %I FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
    
    EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
END $$;
