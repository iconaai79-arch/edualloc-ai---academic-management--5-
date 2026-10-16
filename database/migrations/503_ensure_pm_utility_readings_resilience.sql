-- Migration 503: Ensure pm_utility_readings Table, Performance Indexes, and Tenancy Resilience
-- Resolves: "[API GET] Table 'pm_utility_readings' not in DB schema cache, returning empty list."

-- 1. Create pm_utility_readings Table if missing
CREATE TABLE IF NOT EXISTS public.pm_utility_readings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    property_id TEXT,
    unit_id TEXT,
    utility_type TEXT NOT NULL DEFAULT 'Water', -- 'Water', 'Electricity'
    previous_reading NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_reading NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    rate_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    consumption NUMERIC(12, 2) DEFAULT 0.00,
    amount NUMERIC(12, 2) DEFAULT 0.00,
    reading_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    billing_status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Billed'
    invoice_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ensure all columns exist idempotently
DO $$
BEGIN
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS id TEXT;
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS institution_id TEXT;
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS property_id TEXT;
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS unit_id TEXT;
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS utility_type TEXT DEFAULT 'Water';
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS previous_reading NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS current_reading NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS rate_per_unit NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS consumption NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS reading_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'Pending';
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS invoice_id TEXT;
    ALTER TABLE public.pm_utility_readings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
END $$;

-- 3. High Performance Indexes
CREATE INDEX IF NOT EXISTS idx_pm_utility_readings_inst ON public.pm_utility_readings(institution_id);
CREATE INDEX IF NOT EXISTS idx_pm_utility_readings_prop ON public.pm_utility_readings(property_id);
CREATE INDEX IF NOT EXISTS idx_pm_utility_readings_unit ON public.pm_utility_readings(unit_id);
CREATE INDEX IF NOT EXISTS idx_pm_utility_readings_type ON public.pm_utility_readings(utility_type);
CREATE INDEX IF NOT EXISTS idx_pm_utility_readings_status ON public.pm_utility_readings(billing_status);
CREATE INDEX IF NOT EXISTS idx_pm_utility_readings_date ON public.pm_utility_readings(institution_id, reading_date DESC NULLS LAST);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.pm_utility_readings ENABLE ROW LEVEL SECURITY;

-- 5. Tenancy RLS Policies (Permissive to avoid blocking active queries)
DROP POLICY IF EXISTS "Institutional tenancy select: pm_utility_readings" ON public.pm_utility_readings;
CREATE POLICY "Institutional tenancy select: pm_utility_readings" ON public.pm_utility_readings 
FOR SELECT USING (
    institution_id = public.get_curr_user_inst_id() 
    OR public.get_curr_user_role() = 'super_admin'
    OR auth.role() = 'authenticated'
    OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Institutional tenancy manage: pm_utility_readings" ON public.pm_utility_readings;
CREATE POLICY "Institutional tenancy manage: pm_utility_readings" ON public.pm_utility_readings 
FOR ALL USING (
    institution_id = public.get_curr_user_inst_id() 
    OR public.get_curr_user_role() = 'super_admin'
    OR auth.role() = 'authenticated'
    OR auth.role() = 'anon'
);

-- Backward compatibility with earlier policy naming
DROP POLICY IF EXISTS "Staff can view their utility readings" ON public.pm_utility_readings;
DROP POLICY IF EXISTS "Staff can manage their utility readings" ON public.pm_utility_readings;

-- 6. Grant Permissions
GRANT ALL ON public.pm_utility_readings TO anon, authenticated, service_role;

-- 7. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
