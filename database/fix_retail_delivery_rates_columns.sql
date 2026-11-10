-- ==============================================================================
-- FIX MISSING COLUMNS & CONSTRAINTS ON retail_delivery_rates & retail_couriers
-- Run this in Talksasa / Supabase SQL Editor BEFORE importing your backup dump.
-- ==============================================================================

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.retail_delivery_rates (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add all snake_case and camelCase columns to retail_delivery_rates
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS courier_id TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "courierId" TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "courierName" TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS destination TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS rate DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS estimated_days INTEGER DEFAULT 1;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "estimatedDays" INTEGER DEFAULT 1;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- 3. Drop restrictive constraints to prevent import sequence failures
ALTER TABLE public.retail_delivery_rates ALTER COLUMN institution_id DROP NOT NULL;
ALTER TABLE public.retail_delivery_rates ALTER COLUMN courier_id DROP NOT NULL;
ALTER TABLE public.retail_delivery_rates DROP CONSTRAINT IF EXISTS retail_delivery_rates_courier_id_fkey CASCADE;
ALTER TABLE public.retail_delivery_rates DROP CONSTRAINT IF EXISTS retail_delivery_rates_institution_id_fkey CASCADE;
ALTER TABLE public.retail_delivery_rates DROP CONSTRAINT IF EXISTS fk_retail_delivery_rates_courier CASCADE;
ALTER TABLE public.retail_delivery_rates DROP CONSTRAINT IF EXISTS fk_retail_delivery_rates_institution CASCADE;

-- 4. Ensure companion table public.retail_couriers exists and has all columns
CREATE TABLE IF NOT EXISTS public.retail_couriers (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "courierName" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "fullName" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "vehicleType" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS pricing_model TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "pricingModel" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS base_rate DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "baseRate" DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS per_km_rate DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "perKmRate" DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS coverage_areas JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "coverageAreas" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

