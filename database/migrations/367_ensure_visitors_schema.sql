-- Migration 367: Ensure visitors table and all required columns exist with proper RLS & schema reload
-- Description: Adds missing columns (host_id, host_name, id_number, phone_number, vehicle_plate, vehicle_model, check_in, time_in, time_out, visit_date, purpose, name, full_name, status, visitor_signature, host_signature, security_officer_name, metadata) to visitors

CREATE TABLE IF NOT EXISTS public.visitors (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT,
    full_name TEXT,
    email TEXT,
    phone_number TEXT,
    id_number TEXT,
    purpose TEXT,
    visit_date TEXT,
    time_in TEXT,
    time_out TEXT,
    check_in TEXT,
    host_id TEXT,
    host_name TEXT,
    vehicle_plate TEXT,
    vehicle_model TEXT,
    status TEXT DEFAULT 'pending',
    visitor_signature TEXT,
    host_signature TEXT,
    security_officer_name TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist in case the table was created previously with fewer columns
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS visit_date TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS time_in TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS time_out TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS check_in TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS host_id TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS host_name TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS visitor_signature TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS host_signature TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS security_officer_name TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable Row Level Security
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies to allow seamless operation
DROP POLICY IF EXISTS "Visitors access" ON public.visitors;
DROP POLICY IF EXISTS "Visitors viewable by institution" ON public.visitors;
DROP POLICY IF EXISTS "visitors_institution_isolation" ON public.visitors;

CREATE POLICY "visitors_institution_isolation"
    ON public.visitors
    FOR ALL
    USING (
        institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    )
    WITH CHECK (
        institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    );

-- Grant appropriate permissions
GRANT ALL ON TABLE public.visitors TO anon, authenticated, service_role;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
