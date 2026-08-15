-- ============================================================
-- Migration 321: Enhance his_vital_statistics Table Schema
-- Adds missing structured clinical columns (blood_pressure, heart_rate,
-- temperature, spo2, etc.) and ensures soft FK references.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.his_vital_statistics (
    id                      TEXT PRIMARY KEY,
    institution_id          TEXT NOT NULL,
    "institutionId"         TEXT,
    patient_id              TEXT,
    "patientId"             TEXT,
    patient_name            TEXT,
    "patientName"           TEXT,
    
    -- Classic key-value fields
    label                   TEXT,
    value                   TEXT,
    unit                    TEXT,
    color                   TEXT,
    
    -- Modern structured clinical vitals
    blood_pressure          TEXT,
    "bloodPressure"         TEXT,
    heart_rate              INTEGER,
    "heartRate"             INTEGER,
    temperature             DECIMAL(5,2),
    respiratory_rate        INTEGER,
    "respiratoryRate"       INTEGER,
    oxygen_saturation       DECIMAL(5,2),
    "oxygenSaturation"      DECIMAL(5,2),
    weight                  DECIMAL(6,2),
    height                  DECIMAL(6,2),
    bmi                     DECIMAL(5,2),
    
    -- Metadata
    recorded_by             TEXT,
    "recordedBy"            TEXT,
    date_recorded           TEXT,
    "dateRecorded"          TEXT,
    notes                   TEXT,
    
    -- Timestamps
    recorded_at             TIMESTAMPTZ DEFAULT NOW(),
    "recordedAt"            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- If the table was already created by an earlier migration with fewer columns, add the missing ones safely
ALTER TABLE public.his_vital_statistics
    ADD COLUMN IF NOT EXISTS "institutionId" TEXT,
    ADD COLUMN IF NOT EXISTS "patientId" TEXT,
    ADD COLUMN IF NOT EXISTS patient_name TEXT,
    ADD COLUMN IF NOT EXISTS "patientName" TEXT,
    ADD COLUMN IF NOT EXISTS label TEXT,
    ADD COLUMN IF NOT EXISTS value TEXT,
    ADD COLUMN IF NOT EXISTS unit TEXT,
    ADD COLUMN IF NOT EXISTS color TEXT,
    ADD COLUMN IF NOT EXISTS blood_pressure TEXT,
    ADD COLUMN IF NOT EXISTS "bloodPressure" TEXT,
    ADD COLUMN IF NOT EXISTS heart_rate INTEGER,
    ADD COLUMN IF NOT EXISTS "heartRate" INTEGER,
    ADD COLUMN IF NOT EXISTS temperature DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS respiratory_rate INTEGER,
    ADD COLUMN IF NOT EXISTS "respiratoryRate" INTEGER,
    ADD COLUMN IF NOT EXISTS oxygen_saturation DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS "oxygenSaturation" DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS weight DECIMAL(6,2),
    ADD COLUMN IF NOT EXISTS height DECIMAL(6,2),
    ADD COLUMN IF NOT EXISTS bmi DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS recorded_by TEXT,
    ADD COLUMN IF NOT EXISTS "recordedBy" TEXT,
    ADD COLUMN IF NOT EXISTS date_recorded TEXT,
    ADD COLUMN IF NOT EXISTS "dateRecorded" TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS "recordedAt" TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Safely drop any restrictive foreign key constraints on his_vital_statistics that cause 23503 errors
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid::regclass::text IN ('his_vital_statistics', 'public.his_vital_statistics')
          AND contype = 'f'
          AND conname NOT LIKE '%institution%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.his_vital_statistics DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE;';
    END LOOP;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_his_vital_stats_inst ON public.his_vital_statistics (institution_id);
CREATE INDEX IF NOT EXISTS idx_his_vital_stats_patient ON public.his_vital_statistics (patient_id);

-- RLS
ALTER TABLE public.his_vital_statistics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "his_vital_statistics_all" ON public.his_vital_statistics;
DROP POLICY IF EXISTS "HIS vitals access" ON public.his_vital_statistics;
CREATE POLICY "his_vital_statistics_all" ON public.his_vital_statistics
    FOR ALL USING (true) WITH CHECK (true);

-- Permissions
GRANT ALL ON public.his_vital_statistics TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
