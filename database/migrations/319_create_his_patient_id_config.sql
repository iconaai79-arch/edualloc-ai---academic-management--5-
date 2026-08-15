-- ============================================================
-- Migration 319: HIS Patient ID Configuration Table
-- Creates his_patient_id_config table for custom patient ID / OP
-- number prefixes, sequencing, zero-padding, and auto-assignment.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.his_patient_id_config (
    id                  TEXT PRIMARY KEY,
    institution_id      TEXT NOT NULL,
    "institutionId"     TEXT,
    
    -- Patient ID Format & Counter
    custom_prefix       TEXT NOT NULL DEFAULT 'PID-',
    "customPrefix"      TEXT,
    start_number        INTEGER NOT NULL DEFAULT 1,
    "startNumber"       INTEGER,
    zero_pad_length     INTEGER NOT NULL DEFAULT 3,
    "zeroPadLength"     INTEGER,
    include_year        BOOLEAN NOT NULL DEFAULT FALSE,
    "includeYear"       BOOLEAN,
    auto_assign         BOOLEAN NOT NULL DEFAULT TRUE,
    "autoAssign"        BOOLEAN,
    
    -- Audit Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Index for institution lookup
CREATE INDEX IF NOT EXISTS idx_his_patient_id_config_inst
    ON public.his_patient_id_config (institution_id);

-- One config per institution
CREATE UNIQUE INDEX IF NOT EXISTS idx_his_patient_id_config_unique_inst
    ON public.his_patient_id_config (institution_id);

-- RLS Configuration
ALTER TABLE public.his_patient_id_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "his_patient_id_config_all" ON public.his_patient_id_config;
CREATE POLICY "his_patient_id_config_all" ON public.his_patient_id_config
    FOR ALL USING (true) WITH CHECK (true);

-- Permissions
GRANT ALL ON public.his_patient_id_config TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
