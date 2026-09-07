-- Migration 374: Ensure app_notifications table columns id and user_id are TEXT
-- Description: Allows non-UUID string identifiers (such as 'notif_...' and 'u_...') in app_notifications

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_notifications') THEN
        -- Safely alter id to TEXT if currently UUID
        BEGIN
            ALTER TABLE public.app_notifications ALTER COLUMN id TYPE TEXT USING id::text;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Safely alter user_id to TEXT if currently UUID
        BEGIN
            ALTER TABLE public.app_notifications ALTER COLUMN user_id TYPE TEXT USING user_id::text;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    ELSE
        CREATE TABLE public.app_notifications (
            id TEXT PRIMARY KEY DEFAULT ('notif_' || replace(gen_random_uuid()::text, '-', '')),
            user_id TEXT,
            institution_id TEXT,
            message TEXT NOT NULL,
            type TEXT NOT NULL,
            link TEXT,
            is_read BOOLEAN DEFAULT false,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
