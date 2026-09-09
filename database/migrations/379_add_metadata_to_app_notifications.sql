-- Migration 379: Add metadata column to app_notifications
-- Description: The app_notifications table is missing a JSONB metadata column
-- that the application uses to store visitor names, host IDs, and other
-- contextual data for guest_arrival / visitor notifications.
-- Without this column PostgREST throws a schema-cache stale error and strips
-- the column, causing silent data loss on inserts/upserts.

DO $$
BEGIN
    -- Add metadata column if it does not already exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'app_notifications'
          AND column_name  = 'metadata'
    ) THEN
        ALTER TABLE public.app_notifications
            ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Also ensure visitor_name TEXT column exists (used by some older code paths)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'app_notifications'
          AND column_name  = 'visitor_name'
    ) THEN
        ALTER TABLE public.app_notifications
            ADD COLUMN visitor_name TEXT;
    END IF;

    -- Ensure created_at alias for older queries that prefer created_at over timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'app_notifications'
          AND column_name  = 'created_at'
    ) THEN
        ALTER TABLE public.app_notifications
            ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Tell PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
