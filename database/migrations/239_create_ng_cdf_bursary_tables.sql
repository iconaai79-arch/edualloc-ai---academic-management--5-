-- Migration: Create NG-CDF Bursary Tables
-- Path: database/migrations/239_create_ng_cdf_bursary_tables.sql

CREATE TABLE IF NOT EXISTS public.ng_cdf_funds (
    id TEXT PRIMARY KEY,
    constituency_id TEXT,
    constituency_name TEXT NOT NULL,
    financial_year TEXT NOT NULL,
    total_budget DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    allocated_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    remaining_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    public_participation_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ng_cdf_bursaries (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    institution_id TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    constituency_name TEXT NOT NULL,
    amount_requested DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    amount_approved DOUBLE PRECISION DEFAULT 0.0,
    purpose TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    cheque_number TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    vetted_at TIMESTAMP WITH TIME ZONE,
    vetted_by TEXT,
    disbursed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for funds and bursaries
ALTER TABLE public.ng_cdf_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ng_cdf_bursaries ENABLE ROW LEVEL SECURITY;

-- Apply basic permissive policy for authenticated and anonymous users
DO $$
DECLARE
    tables text[] := ARRAY['ng_cdf_funds', 'ng_cdf_bursaries'];
    t text;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Enable all access for authenticated users" ON public.%I FOR ALL USING (auth.role() = ''authenticated'' OR auth.role() = ''anon'')', t);
        
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;