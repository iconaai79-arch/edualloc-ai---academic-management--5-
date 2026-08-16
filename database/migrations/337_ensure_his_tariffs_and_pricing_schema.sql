-- ==============================================================================
-- Migration: 337_ensure_his_tariffs_and_pricing_schema.sql
-- Description: Create his_tariffs, his_insurance_providers, his_hospital_rooms,
--              his_partner_labs tables with indexes and permissive RLS policies.
-- ==============================================================================

-- 1. Table: his_tariffs
CREATE TABLE IF NOT EXISTS public.his_tariffs (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    "institutionId" TEXT,
    name TEXT,
    category TEXT DEFAULT 'General',
    code TEXT,
    type TEXT DEFAULT 'custom',
    
    -- Custom service rates
    cash_rate NUMERIC(12,2) DEFAULT 0,
    cover_rate NUMERIC(12,2) DEFAULT 0,
    "cashRate" NUMERIC(12,2) DEFAULT 0,
    "coverRate" NUMERIC(12,2) DEFAULT 0,
    
    -- General Consultation rates
    cash_consultation NUMERIC(12,2),
    cover_consultation NUMERIC(12,2),
    "cashConsultation" NUMERIC(12,2),
    "coverConsultation" NUMERIC(12,2),
    
    -- Specialist Consultation rates
    specialist_cash_consultation NUMERIC(12,2),
    specialist_cover_consultation NUMERIC(12,2),
    "specialistCashConsultation" NUMERIC(12,2),
    "specialistCoverConsultation" NUMERIC(12,2),
    
    -- Emergency / STAT Consultation rates
    emergency_cash_consultation NUMERIC(12,2),
    emergency_cover_consultation NUMERIC(12,2),
    "emergencyCashConsultation" NUMERIC(12,2),
    "emergencyCoverConsultation" NUMERIC(12,2),
    emergency_surcharge NUMERIC(12,2) DEFAULT 0,
    "emergencySurcharge" NUMERIC(12,2) DEFAULT 0,
    revisit_fee NUMERIC(12,2) DEFAULT 0,
    "revisitFee" NUMERIC(12,2) DEFAULT 0,
    
    -- Flags & Configuration
    is_active BOOLEAN DEFAULT TRUE,
    "isActive" BOOLEAN DEFAULT TRUE,
    is_coverable BOOLEAN DEFAULT TRUE,
    "isCoverable" BOOLEAN DEFAULT TRUE,
    
    description TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist cleanly
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'custom';
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS cash_rate NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS cover_rate NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "cashRate" NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "coverRate" NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS cash_consultation NUMERIC(12,2);
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS cover_consultation NUMERIC(12,2);
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "cashConsultation" NUMERIC(12,2);
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "coverConsultation" NUMERIC(12,2);
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS emergency_surcharge NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "emergencySurcharge" NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS revisit_fee NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "revisitFee" NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS specialist_cash_consultation NUMERIC(12,2);
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS specialist_cover_consultation NUMERIC(12,2);
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "specialistCashConsultation" NUMERIC(12,2);
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "specialistCoverConsultation" NUMERIC(12,2);
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS emergency_cash_consultation NUMERIC(12,2);
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS emergency_cover_consultation NUMERIC(12,2);
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "emergencyCashConsultation" NUMERIC(12,2);
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "emergencyCoverConsultation" NUMERIC(12,2);
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS is_coverable BOOLEAN DEFAULT TRUE;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "isCoverable" BOOLEAN DEFAULT TRUE;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.his_tariffs ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Table: his_insurance_providers
CREATE TABLE IF NOT EXISTS public.his_insurance_providers (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    "institutionId" TEXT,
    name TEXT NOT NULL,
    code TEXT,
    contact_person TEXT,
    "contactPerson" TEXT,
    phone TEXT,
    email TEXT,
    coverage_details JSONB DEFAULT '{}'::jsonb,
    "coverageDetails" JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.his_insurance_providers ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.his_insurance_providers ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.his_insurance_providers ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.his_insurance_providers ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.his_insurance_providers ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;
ALTER TABLE public.his_insurance_providers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.his_insurance_providers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.his_insurance_providers ADD COLUMN IF NOT EXISTS coverage_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.his_insurance_providers ADD COLUMN IF NOT EXISTS "coverageDetails" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.his_insurance_providers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.his_insurance_providers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.his_insurance_providers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.his_insurance_providers ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Table: his_hospital_rooms
CREATE TABLE IF NOT EXISTS public.his_hospital_rooms (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    "institutionId" TEXT,
    room_number TEXT,
    "roomNumber" TEXT,
    name TEXT,
    ward_id TEXT,
    "wardId" TEXT,
    room_type TEXT DEFAULT 'General',
    "roomType" TEXT DEFAULT 'General',
    daily_rate NUMERIC(12,2) DEFAULT 0,
    "dailyRate" NUMERIC(12,2) DEFAULT 0,
    capacity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Available',
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS "roomNumber" TEXT;
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS ward_id TEXT;
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS "wardId" TEXT;
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS room_type TEXT DEFAULT 'General';
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS "roomType" TEXT DEFAULT 'General';
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS "dailyRate" NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1;
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Available';
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.his_hospital_rooms ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Table: his_partner_labs
CREATE TABLE IF NOT EXISTS public.his_partner_labs (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    "institutionId" TEXT,
    name TEXT NOT NULL,
    code TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    portal_url TEXT,
    status TEXT DEFAULT 'Active',
    services_offered JSONB DEFAULT '[]'::jsonb,
    turnaround_time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS portal_url TEXT;
ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS services_offered JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS turnaround_time TEXT;
ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.his_partner_labs ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_his_tariffs_inst ON public.his_tariffs(COALESCE(institution_id, "institutionId"));
CREATE INDEX IF NOT EXISTS idx_his_tariffs_cat ON public.his_tariffs(category);
CREATE INDEX IF NOT EXISTS idx_his_tariffs_code ON public.his_tariffs(code);
CREATE INDEX IF NOT EXISTS idx_his_ins_providers_inst ON public.his_insurance_providers(COALESCE(institution_id, "institutionId"));
CREATE INDEX IF NOT EXISTS idx_his_hosp_rooms_inst ON public.his_hospital_rooms(COALESCE(institution_id, "institutionId"));
CREATE INDEX IF NOT EXISTS idx_his_partner_labs_inst ON public.his_partner_labs(COALESCE(institution_id, "institutionId"));

-- Enable RLS
ALTER TABLE public.his_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.his_insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.his_hospital_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.his_partner_labs ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies
DROP POLICY IF EXISTS "Allow public access to his_tariffs" ON public.his_tariffs;
CREATE POLICY "Allow public access to his_tariffs" ON public.his_tariffs
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to his_insurance_providers" ON public.his_insurance_providers;
CREATE POLICY "Allow public access to his_insurance_providers" ON public.his_insurance_providers
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to his_hospital_rooms" ON public.his_hospital_rooms;
CREATE POLICY "Allow public access to his_hospital_rooms" ON public.his_hospital_rooms
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to his_partner_labs" ON public.his_partner_labs;
CREATE POLICY "Allow public access to his_partner_labs" ON public.his_partner_labs
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions to standard roles
GRANT ALL ON public.his_tariffs TO authenticated, anon, service_role;
GRANT ALL ON public.his_insurance_providers TO authenticated, anon, service_role;
GRANT ALL ON public.his_hospital_rooms TO authenticated, anon, service_role;
GRANT ALL ON public.his_partner_labs TO authenticated, anon, service_role;
