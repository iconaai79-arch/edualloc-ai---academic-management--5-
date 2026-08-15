-- ============================================================
-- Migration 320: HIS Medical Notes & Clinical Events Tables
-- Creates his_medical_notes and his_clinical_events tables
-- with soft foreign keys, dual-case support, RLS, and indexes.
-- ============================================================

-- 1. MEDICAL / SOAP NOTES TABLE
CREATE TABLE IF NOT EXISTS public.his_medical_notes (
    id                  TEXT PRIMARY KEY,
    institution_id      TEXT NOT NULL,
    "institutionId"     TEXT,
    patient_id          TEXT,
    "patientId"         TEXT,
    patient_name        TEXT,
    "patientName"       TEXT,
    doctor_id           TEXT,
    "doctorId"          TEXT,
    doctor_name         TEXT,
    "doctorName"        TEXT,
    
    -- Clinical Encounter Details
    encounter_date      TIMESTAMPTZ DEFAULT NOW(),
    "encounterDate"     TIMESTAMPTZ,
    template_used       TEXT,
    "templateUsed"      TEXT,
    
    -- SOAP Components
    subjective          TEXT,
    objective           TEXT,
    assessment          TEXT,
    plan                TEXT,
    diagnosis           TEXT,
    vitals              JSONB DEFAULT '{}'::jsonb,
    
    -- Audit Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CLINICAL EVENTS / ENCOUNTER LOGS TABLE
CREATE TABLE IF NOT EXISTS public.his_clinical_events (
    id                  TEXT PRIMARY KEY,
    institution_id      TEXT NOT NULL,
    "institutionId"     TEXT,
    patient_id          TEXT,
    "patientId"         TEXT,
    patient_name        TEXT,
    "patientName"       TEXT,
    doctor_id           TEXT,
    "doctorId"          TEXT,
    doctor_name         TEXT,
    "doctorName"        TEXT,
    
    -- Event Details
    event_type          TEXT DEFAULT 'Consultation', -- 'Consultation', 'Lab Result', 'Admission', 'Discharge', 'Procedure'
    "eventType"         TEXT,
    event               TEXT,
    title               TEXT,
    notes               TEXT,
    metadata            JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    event_date          TIMESTAMPTZ DEFAULT NOW(),
    "eventDate"         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_his_medical_notes_institution
    ON public.his_medical_notes (institution_id);

CREATE INDEX IF NOT EXISTS idx_his_medical_notes_patient
    ON public.his_medical_notes (patient_id);

CREATE INDEX IF NOT EXISTS idx_his_clinical_events_inst_patient
    ON public.his_clinical_events (institution_id, patient_id);

-- RLS Configuration
ALTER TABLE public.his_medical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.his_clinical_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "his_medical_notes_all" ON public.his_medical_notes;
CREATE POLICY "his_medical_notes_all" ON public.his_medical_notes
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "his_clinical_events_all" ON public.his_clinical_events;
CREATE POLICY "his_clinical_events_all" ON public.his_clinical_events
    FOR ALL USING (true) WITH CHECK (true);

-- Permissions
GRANT ALL ON public.his_medical_notes TO anon, authenticated, service_role;
GRANT ALL ON public.his_clinical_events TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
