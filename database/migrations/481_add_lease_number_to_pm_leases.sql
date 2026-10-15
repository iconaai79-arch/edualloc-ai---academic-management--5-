-- Migration 481: Add lease_number to pm_leases
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_leases') THEN
        ALTER TABLE public.pm_leases ADD COLUMN IF NOT EXISTS lease_number TEXT;
    END IF;
END $$;
