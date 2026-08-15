-- ============================================================
-- Migration 316: Document Collections Table
-- Creates document_collections table with RLS and dual-case support.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.document_collections (
    id                  TEXT PRIMARY KEY,
    institution_id      TEXT NOT NULL,
    "institutionId"     TEXT,
    
    -- Document info
    document_type       TEXT NOT NULL, -- Certificate, ID Card, Transcript, etc.
    "documentType"      TEXT,
    
    -- Owner details
    owner_name          TEXT NOT NULL,
    "ownerName"         TEXT,
    owner_id            TEXT,
    "ownerId"           TEXT,
    owner_phone         TEXT,
    "ownerPhone"        TEXT,
    
    -- Status & Handover details
    status              TEXT NOT NULL DEFAULT 'Pending', -- Pending, Ready, Collected
    dropped_off_by      TEXT NOT NULL,
    "droppedOffBy"      TEXT,
    dropped_off_date    TIMESTAMPTZ DEFAULT NOW(),
    "droppedOffDate"    TIMESTAMPTZ,
    collected_date      TIMESTAMPTZ,
    "collectedDate"     TIMESTAMPTZ,
    notes               TEXT,
    
    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quick searching
CREATE INDEX IF NOT EXISTS idx_document_collections_institution
    ON public.document_collections (institution_id);

CREATE INDEX IF NOT EXISTS idx_document_collections_owner_name
    ON public.document_collections (owner_name);

CREATE INDEX IF NOT EXISTS idx_document_collections_status
    ON public.document_collections (status);

-- RLS
ALTER TABLE public.document_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_collections_all" ON public.document_collections;
CREATE POLICY "document_collections_all" ON public.document_collections
    FOR ALL USING (true) WITH CHECK (true);

-- Permissions
GRANT ALL ON public.document_collections TO anon, authenticated, service_role;
