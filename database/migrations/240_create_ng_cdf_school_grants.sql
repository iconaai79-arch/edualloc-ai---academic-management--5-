-- Migration: Create NG-CDF School Grants Tables
-- Path: database/migrations/240_create_ng_cdf_school_grants.sql

CREATE TABLE IF NOT EXISTS public.ng_cdf_school_grants (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    constituency_name TEXT NOT NULL,
    cheque_number TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    financial_year TEXT NOT NULL,
    purpose TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for grants table
ALTER TABLE public.ng_cdf_school_grants ENABLE ROW LEVEL SECURITY;

-- Apply basic permissive policy for authenticated and anonymous users
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.ng_cdf_school_grants;
CREATE POLICY "Enable all access for authenticated users" ON public.ng_cdf_school_grants FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

GRANT ALL ON public.ng_cdf_school_grants TO anon, authenticated, service_role;
