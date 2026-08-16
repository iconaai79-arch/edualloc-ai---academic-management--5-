-- ==============================================================================
-- Migration: 341_ensure_his_mch_cwc_and_nbu_schema.sql
-- Description: Creates Maternal & Child Health (MCH), Child Welfare Clinic (CWC),
--              and Newborn Unit (NBU / NICU / KMC) tables for HIS.
-- ==============================================================================

-- 1. his_anc_records (Ante-Natal Care & Maternal Longitudinal Charting)
CREATE TABLE IF NOT EXISTS public.his_anc_records (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    institutionid TEXT,
    mother_id TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    lmp DATE,
    edd DATE,
    gravida INTEGER DEFAULT 1,
    parity INTEGER DEFAULT 0,
    gestation_weeks NUMERIC DEFAULT 0,
    blood_group TEXT,
    rhesus TEXT,
    height_cm NUMERIC,
    high_risk_factors JSONB DEFAULT '[]'::jsonb,
    pmtct_status TEXT DEFAULT 'Negative',
    syphilis_status TEXT DEFAULT 'Negative',
    hepatitis_b_status TEXT DEFAULT 'Negative',
    ultrasound_summary TEXT,
    visits JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Active',
    enrolled_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. his_delivery_records (Labor & Delivery Register / Birth Summaries)
CREATE TABLE IF NOT EXISTS public.his_delivery_records (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    institutionid TEXT,
    mother_id TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    baby_id TEXT,
    baby_name TEXT,
    delivery_date DATE NOT NULL,
    delivery_time TEXT,
    gestation_weeks NUMERIC,
    delivery_mode TEXT DEFAULT 'Spontaneous Vertex (SVD)',
    episiotomy_tear TEXT DEFAULT 'None',
    blood_loss_ml NUMERIC DEFAULT 250,
    oxytocin_given BOOLEAN DEFAULT TRUE,
    placenta_complete BOOLEAN DEFAULT TRUE,
    baby_gender TEXT DEFAULT 'Female',
    birth_weight_kg NUMERIC DEFAULT 3.2,
    apgar_1min INTEGER DEFAULT 9,
    apgar_5min INTEGER DEFAULT 10,
    resuscitation_done BOOLEAN DEFAULT FALSE,
    baby_status TEXT DEFAULT 'Healthy / In-Room with Mother',
    delivered_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. his_cwc_immunizations (Child Welfare Clinic & KEPI Vaccination Flowsheet)
CREATE TABLE IF NOT EXISTS public.his_cwc_immunizations (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    institutionid TEXT,
    child_id TEXT NOT NULL,
    child_name TEXT NOT NULL,
    mother_id TEXT,
    mother_name TEXT,
    dob DATE NOT NULL,
    gender TEXT DEFAULT 'Male',
    birth_weight_kg NUMERIC,
    immunizations JSONB DEFAULT '[]'::jsonb,
    growth_records JSONB DEFAULT '[]'::jsonb,
    developmental_milestones JSONB DEFAULT '[]'::jsonb,
    next_clinic_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. his_nbu_admissions (Newborn Unit / NICU / Kangaroo Mother Care Bay)
CREATE TABLE IF NOT EXISTS public.his_nbu_admissions (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    institutionid TEXT,
    baby_id TEXT NOT NULL,
    baby_name TEXT NOT NULL,
    mother_id TEXT,
    mother_name TEXT,
    admission_date TIMESTAMPTZ DEFAULT NOW(),
    admission_reason TEXT NOT NULL,
    birth_weight_kg NUMERIC NOT NULL,
    current_weight_kg NUMERIC NOT NULL,
    gestation_weeks NUMERIC,
    incubator_bay TEXT,
    phototherapy_active BOOLEAN DEFAULT FALSE,
    cpap_oxygen_active BOOLEAN DEFAULT FALSE,
    feeding_mode TEXT DEFAULT 'EBM (Expressed Breast Milk)',
    apgar_1min INTEGER,
    apgar_5min INTEGER,
    daily_weights JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Admitted', -- 'Admitted' | 'KMC' | 'Discharged' | 'Referred'
    discharge_date TIMESTAMPTZ,
    discharged_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning queries
CREATE INDEX IF NOT EXISTS idx_his_anc_mother_id ON public.his_anc_records(mother_id);
CREATE INDEX IF NOT EXISTS idx_his_delivery_mother_id ON public.his_delivery_records(mother_id);
CREATE INDEX IF NOT EXISTS idx_his_cwc_child_id ON public.his_cwc_immunizations(child_id);
CREATE INDEX IF NOT EXISTS idx_his_nbu_baby_id ON public.his_nbu_admissions(baby_id);

-- Enable RLS and Permissive Policies
ALTER TABLE public.his_anc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.his_delivery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.his_cwc_immunizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.his_nbu_admissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access to his_anc_records" ON public.his_anc_records;
    CREATE POLICY "Public access to his_anc_records" ON public.his_anc_records FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access to his_delivery_records" ON public.his_delivery_records;
    CREATE POLICY "Public access to his_delivery_records" ON public.his_delivery_records FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access to his_cwc_immunizations" ON public.his_cwc_immunizations;
    CREATE POLICY "Public access to his_cwc_immunizations" ON public.his_cwc_immunizations FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access to his_nbu_admissions" ON public.his_nbu_admissions;
    CREATE POLICY "Public access to his_nbu_admissions" ON public.his_nbu_admissions FOR ALL USING (true) WITH CHECK (true);
END $$;
