-- Migration 380: Add all missing columns to app_notifications
-- Description: apiService.createNotification() writes these top-level columns
-- to the table. PostgREST throws "schema cache stale: stripping un-cached column"
-- for each one that doesn't exist. This migration ensures the full schema is
-- present so every insert/upsert succeeds without silent data loss.
--
-- Columns added:
--   purpose       TEXT  - short description of the notification context
--   visitor_name  TEXT  - already added in 379 but guarded with IF NOT EXISTS
--   metadata      JSONB - already added in 379 but guarded with IF NOT EXISTS
--   created_at    TIMESTAMPTZ - alias for timestamp (added in 379, guarded)
--   is_read       BOOLEAN - some code writes is_read vs isRead; ensure both are present
--   institution_id TEXT - ensure exists (was in original DDL but guard anyway)

DO $$
BEGIN
    -- purpose
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'purpose'
    ) THEN
        ALTER TABLE public.app_notifications ADD COLUMN purpose TEXT;
    END IF;

    -- visitor_name (guard in case 379 was never run)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'visitor_name'
    ) THEN
        ALTER TABLE public.app_notifications ADD COLUMN visitor_name TEXT;
    END IF;

    -- metadata (guard in case 379 was never run)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.app_notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- created_at (guard in case 379 was never run)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.app_notifications ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- is_read (some inserts use snake_case column directly)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'is_read'
    ) THEN
        ALTER TABLE public.app_notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;

    -- institution_id (ensure exists as TEXT, not UUID)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE public.app_notifications ADD COLUMN institution_id TEXT;
    END IF;

    -- link (used for click-through URLs in notifications)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'link'
    ) THEN
        ALTER TABLE public.app_notifications ADD COLUMN link TEXT;
    END IF;
END $$;

-- Force PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
