-- ==============================================================================
-- Migration: 342_ensure_his_mch_tariff_columns.sql
-- Description: Ensures MCH (Maternal & Child Health) Tariff Schedule columns
--              and index support exist on his_tariffs.
-- ==============================================================================

-- 1. Extend his_tariffs with MCH-specific attributes
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS mch_clinic_type TEXT;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "mchClinicType" TEXT;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS anc_visit_number INTEGER;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "ancVisitNumber" INTEGER;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS package_type TEXT;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "packageType" TEXT;

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_his_tariffs_mch ON public.his_tariffs(mch_clinic_type);
CREATE INDEX IF NOT EXISTS idx_his_tariffs_category ON public.his_tariffs(category);

-- 3. Ensure permissions
GRANT ALL ON public.his_tariffs TO authenticated, anon, service_role;
