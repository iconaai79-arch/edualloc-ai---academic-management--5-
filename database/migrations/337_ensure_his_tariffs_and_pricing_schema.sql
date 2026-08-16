-- ==============================================================================
-- Migration: 337_ensure_his_tariffs_and_pricing_schema.sql
-- Description: Create his_tariffs, his_insurance_providers, his_hospital_rooms,
--              his_partner_labs tables with dual naming columns (snake_case and camelCase),
--              indexes, and permissive RLS policies.
-- ==============================================================================

-- 1. Table: his_tariffs
CREATE TABLE IF NOT EXISTS public.his_tariffs (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    institutionId TEXT,
    name TEXT,
    category TEXT DEFAULT 'General',
    code TEXT,
    type TEXT DEFAULT 'custom',
    
    -- Custom service rates
    cash_rate NUMERIC(12,2) DEFAULT 0,
    cover_rate NUMERIC(12,2) DEFAULT 0,
    cashRate NUMERIC(12,2) DEFAULT 0,
    coverRate NUMERIC(12,2) DEFAULT 0,
    
    -- General Consultation rates
    cash_consultation NUMERIC(12,2),
    cover_consultation NUMERIC(12,2),
    cashConsultation NUMERIC(12,2),
    coverConsultation NUMERIC(12,2),
    
    -- Specialist Consultation rates
    specialist_cash_consultation NUMERIC(12,2),
    specialist_cover_consultation NUMERIC(12,2),
    specialistCashConsultation NUMERIC(12,2),
    specialistCoverConsultation NUMERIC(12,2),
    
    -- Emergency / STAT Consultation rates
    emergency_cash_consultation NUMERIC(12,2),
    emergency_cover_consultation NUMERIC(12,2),
    emergencyCashConsultation NUMERIC(12,2),
    emergencyCoverConsultation NUMERIC(12,2),
    
    -- Flags & Configuration
    is_active BOOLEAN DEFAULT TRUE,
    isActive BOOLEAN DEFAULT TRUE,
    is_coverable BOOLEAN DEFAULT TRUE,
    isCoverable BOOLEAN DEFAULT TRUE,
    
    description TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all required columns exist if table already exists
DO $$ 
BEGIN
    -- institution columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'institution_id') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN institution_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'institutionId') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN institutionId TEXT;
    END IF;

    -- rates columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'cash_rate') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN cash_rate NUMERIC(12,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'cover_rate') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN cover_rate NUMERIC(12,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'cashRate') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN cashRate NUMERIC(12,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'coverRate') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN coverRate NUMERIC(12,2) DEFAULT 0;
    END IF;

    -- consultation columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'cashConsultation') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN cashConsultation NUMERIC(12,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'coverConsultation') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN coverConsultation NUMERIC(12,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'cash_consultation') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN cash_consultation NUMERIC(12,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'cover_consultation') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN cover_consultation NUMERIC(12,2);
    END IF;
    
    -- flags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'isActive') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN isActive BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'is_active') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'isCoverable') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN isCoverable BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'is_coverable') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN is_coverable BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'category') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN category TEXT DEFAULT 'General';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'code') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_tariffs' AND column_name = 'type') THEN
        ALTER TABLE public.his_tariffs ADD COLUMN type TEXT DEFAULT 'custom';
    END IF;
END $$;

-- 2. Table: his_insurance_providers
CREATE TABLE IF NOT EXISTS public.his_insurance_providers (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    institutionId TEXT,
    name TEXT NOT NULL,
    code TEXT,
    contact_person TEXT,
    contactPerson TEXT,
    phone TEXT,
    email TEXT,
    coverage_details JSONB DEFAULT '{}'::jsonb,
    coverageDetails JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table: his_hospital_rooms
CREATE TABLE IF NOT EXISTS public.his_hospital_rooms (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    institutionId TEXT,
    room_number TEXT,
    roomNumber TEXT,
    name TEXT,
    ward_id TEXT,
    wardId TEXT,
    room_type TEXT DEFAULT 'General',
    roomType TEXT DEFAULT 'General',
    daily_rate NUMERIC(12,2) DEFAULT 0,
    dailyRate NUMERIC(12,2) DEFAULT 0,
    capacity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Available',
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table: his_partner_labs
CREATE TABLE IF NOT EXISTS public.his_partner_labs (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    institutionId TEXT,
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
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_his_tariffs_inst ON public.his_tariffs(COALESCE(institution_id, institutionId));
CREATE INDEX IF NOT EXISTS idx_his_tariffs_cat ON public.his_tariffs(category);
CREATE INDEX IF NOT EXISTS idx_his_tariffs_code ON public.his_tariffs(code);
CREATE INDEX IF NOT EXISTS idx_his_ins_providers_inst ON public.his_insurance_providers(COALESCE(institution_id, institutionId));
CREATE INDEX IF NOT EXISTS idx_his_hosp_rooms_inst ON public.his_hospital_rooms(COALESCE(institution_id, institutionId));
CREATE INDEX IF NOT EXISTS idx_his_partner_labs_inst ON public.his_partner_labs(COALESCE(institution_id, institutionId));

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

-- Grant permissions to standard Supabase roles
GRANT ALL ON public.his_tariffs TO authenticated, anon, service_role;
GRANT ALL ON public.his_insurance_providers TO authenticated, anon, service_role;
GRANT ALL ON public.his_hospital_rooms TO authenticated, anon, service_role;
GRANT ALL ON public.his_partner_labs TO authenticated, anon, service_role;
