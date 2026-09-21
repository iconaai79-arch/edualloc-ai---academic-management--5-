-- Migration 407: Add notify_host_sms and host_phone to visitors table & add indexes for app_notifications
-- Purpose: Prevent PGRST204 schema cache stale errors and avoid query timeouts

DO $$
BEGIN
    -- 1. Ensure public.visitors has notify_host_sms and host_phone
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'visitors'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'visitors' AND column_name = 'notify_host_sms'
        ) THEN
            ALTER TABLE public.visitors ADD COLUMN notify_host_sms BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'visitors' AND column_name = 'host_phone'
        ) THEN
            ALTER TABLE public.visitors ADD COLUMN host_phone TEXT;
        END IF;
    END IF;

    -- 2. Optimize app_notifications indexing to avoid query timeouts
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'app_notifications'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_app_notifications_user_id ON public.app_notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_app_notifications_institution_id ON public.app_notifications(institution_id);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
