-- ============================================================
-- Migration 313: Watchlist Records Table
-- Creates watchlist_records table with RLS and indices.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.watchlist_records (
    id                  TEXT PRIMARY KEY,
    institution_id      TEXT NOT NULL,
    "institutionId"     TEXT,
    name                TEXT NOT NULL,
    phone_number        TEXT,
    "phoneNumber"       TEXT,
    id_number           TEXT,
    "idNumber"          TEXT,
    reason              TEXT NOT NULL,
    severity            TEXT NOT NULL DEFAULT 'Medium', -- Low, Medium, High
    added_by            TEXT,
    "addedBy"           TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_watchlist_records_institution
    ON public.watchlist_records (institution_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_records_id_number
    ON public.watchlist_records (id_number);

CREATE INDEX IF NOT EXISTS idx_watchlist_records_phone
    ON public.watchlist_records (phone_number);

-- RLS Configuration
ALTER TABLE public.watchlist_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "watchlist_records_all" ON public.watchlist_records;
CREATE POLICY "watchlist_records_all" ON public.watchlist_records
    FOR ALL USING (true) WITH CHECK (true);

-- Permissions
GRANT ALL ON public.watchlist_records TO anon, authenticated, service_role;
