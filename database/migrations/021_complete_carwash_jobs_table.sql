-- Complete SQL definition for the carwash_jobs table
-- based on the frontend CarWashJob interface

-- CAUTION: Uncomment the drop table command only if you want to completely 
-- delete the existing table and all its data before recreating it.
-- DROP TABLE IF EXISTS public.carwash_jobs CASCADE;

CREATE TABLE IF NOT EXISTS public.carwash_jobs (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES public.carwash_customers(id) ON DELETE SET NULL,
    vehicle_id TEXT REFERENCES public.carwash_vehicles(id) ON DELETE SET NULL,
    vehicle_plate TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    package_id TEXT REFERENCES public.carwash_packages(id) ON DELETE SET NULL,
    package_name TEXT NOT NULL,
    add_ons TEXT[],
    attendant_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    attendant_name TEXT,
    bay_number INTEGER,
    status TEXT NOT NULL DEFAULT 'queued',
    payment_method TEXT NOT NULL,
    amount_charged DECIMAL(12, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
    is_loyalty_redemption BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    commission_earned DECIMAL(12, 2) DEFAULT 0,
    is_commission_paid BOOLEAN DEFAULT FALSE
);

-- Row Level Security
ALTER TABLE public.carwash_jobs ENABLE ROW LEVEL SECURITY;

-- Disable generic access to avoid conflicts, then define the correct policy
DROP POLICY IF EXISTS "Enable read access for all" ON public.carwash_jobs;
DROP POLICY IF EXISTS "Enable insert access for all" ON public.carwash_jobs;
DROP POLICY IF EXISTS "Enable update access for all" ON public.carwash_jobs;
DROP POLICY IF EXISTS "Enable delete access for all" ON public.carwash_jobs;
DROP POLICY IF EXISTS "Institution staff can manage carwash_jobs" ON public.carwash_jobs;

-- Standard isolated policy: users can only manage jobs in their own institution
CREATE POLICY "Institution staff can manage carwash_jobs" 
ON public.carwash_jobs 
FOR ALL 
USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid())
);
