-- 211. CREATE DRIVING SCHOOL LICENSE CATEGORIES AND VOTES TABLES
-- Adds dedicated tables to manage standard NTSA/Local License Categories and flexible Fee Votes/Heads.

CREATE TABLE IF NOT EXISTS ds_license_categories (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    base_fee DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(code, institution_id)
);

CREATE TABLE IF NOT EXISTS ds_votes (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    vote_name TEXT NOT NULL,
    default_amount DECIMAL(12, 2) DEFAULT 0,
    is_mandatory BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vote_name, institution_id)
);

-- Extend ds_settings table with atomic cache columns
ALTER TABLE ds_settings ADD COLUMN IF NOT EXISTS license_categories JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ds_settings ADD COLUMN IF NOT EXISTS votes JSONB DEFAULT '[]'::jsonb;

-- Enable RLS for new tables
ALTER TABLE ds_license_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_votes ENABLE ROW LEVEL SECURITY;

-- Apply standard dynamic RLS policies
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['ds_license_categories', 'ds_votes'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy select: %I" ON %I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
        
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy manage: %I" ON %I FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
        
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;
