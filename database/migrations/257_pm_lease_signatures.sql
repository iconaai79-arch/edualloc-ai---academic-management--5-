-- Migration 257: Add landlord and tenant signature columns to pm_leases
ALTER TABLE public.pm_leases ADD COLUMN IF NOT EXISTS tenant_signature_url TEXT;
ALTER TABLE public.pm_leases ADD COLUMN IF NOT EXISTS landlord_signature_url TEXT;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
