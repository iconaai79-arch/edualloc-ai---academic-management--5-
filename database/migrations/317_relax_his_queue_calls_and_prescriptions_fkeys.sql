-- ============================================================
-- Migration 317: Ensure his_queue_calls exists and drop rigid FKs
-- Drops foreign key constraints on patient_id and doctor_id so that
-- walk-ins, unregistered patients, and custom IDs do not trigger 23503.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.his_queue_calls (
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
    room_no             TEXT DEFAULT 'Waiting Area',
    "roomNo"            TEXT,
    token_no            TEXT,
    "tokenNo"           TEXT,
    ticket_no           TEXT,
    "ticketNo"          TEXT,
    priority            TEXT DEFAULT 'Routine',
    wait_mins           INTEGER DEFAULT 0,
    "waitMins"          INTEGER,
    complaint           TEXT,
    status              TEXT DEFAULT 'Waiting', -- Waiting, In Consultation, Completed, Cancelled
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Safely drop any restrictive foreign key constraints that cause 23503 errors
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname, conrelid::regclass AS tablename
        FROM pg_constraint
        WHERE conrelid::regclass::text IN ('his_queue_calls', 'public.his_queue_calls', 'his_prescriptions', 'public.his_prescriptions', 'his_billing_items', 'public.his_billing_items')
          AND contype = 'f'
          AND conname NOT LIKE '%institution%'
    ) LOOP
        EXECUTE 'ALTER TABLE ' || r.tablename || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE;';
    END LOOP;
END $$;

-- Ensure indexes for performance
CREATE INDEX IF NOT EXISTS idx_his_queue_calls_institution
    ON public.his_queue_calls (institution_id);

CREATE INDEX IF NOT EXISTS idx_his_queue_calls_patient
    ON public.his_queue_calls (patient_id);

CREATE INDEX IF NOT EXISTS idx_his_queue_calls_status
    ON public.his_queue_calls (status);

-- RLS
ALTER TABLE public.his_queue_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "his_queue_calls_all" ON public.his_queue_calls;
CREATE POLICY "his_queue_calls_all" ON public.his_queue_calls
    FOR ALL USING (true) WITH CHECK (true);

-- Permissions
GRANT ALL ON public.his_queue_calls TO anon, authenticated, service_role;
