-- Migration: 307_his_branding_table.sql
-- Description: Creates his_branding table to store hospital branding, identity, mottos, colors and logos.

CREATE TABLE IF NOT EXISTS his_branding (
    id VARCHAR(200) PRIMARY KEY,
    institution_id VARCHAR(100),
    hospital_name TEXT,
    motto TEXT,
    primary_color VARCHAR(50),
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast institution lookups
CREATE INDEX IF NOT EXISTS idx_his_branding_inst_id ON his_branding (institution_id);

-- Enable Row Level Security
ALTER TABLE his_branding ENABLE ROW LEVEL SECURITY;

-- Drop policy first to avoid deadlock, then recreate cleanly
DROP POLICY IF EXISTS "Allow public all access on his_branding" ON his_branding;
DROP POLICY IF EXISTS "his_branding_select" ON his_branding;
DROP POLICY IF EXISTS "his_branding_insert" ON his_branding;
DROP POLICY IF EXISTS "his_branding_update" ON his_branding;
DROP POLICY IF EXISTS "his_branding_delete" ON his_branding;

CREATE POLICY "his_branding_select" ON his_branding
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "his_branding_insert" ON his_branding
    FOR INSERT TO authenticated, anon
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "his_branding_update" ON his_branding
    FOR UPDATE TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL)
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "his_branding_delete" ON his_branding
    FOR DELETE TO authenticated
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin');

-- Grant access to default roles
GRANT ALL ON his_branding TO anon;
GRANT ALL ON his_branding TO authenticated;
GRANT ALL ON his_branding TO service_role;
