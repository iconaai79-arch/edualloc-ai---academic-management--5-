-- Migration 417: Optimize app_notifications table indexes and RLS performance
-- Purpose: Accelerate notification fetching, eliminate PostgREST statement timeouts,
-- and prevent 18s watchdog aborts by providing composite indexes for user_id, institution_id,
-- is_read, timestamp, and created_at.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'app_notifications'
    ) THEN
        -- 1. Index on user_id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'user_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_app_notifs_user_id ON public.app_notifications(user_id);
            
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'timestamp'
            ) THEN
                CREATE INDEX IF NOT EXISTS idx_app_notifs_user_timestamp ON public.app_notifications(user_id, timestamp DESC);
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'created_at'
            ) THEN
                CREATE INDEX IF NOT EXISTS idx_app_notifs_user_created ON public.app_notifications(user_id, created_at DESC);
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'is_read'
            ) THEN
                CREATE INDEX IF NOT EXISTS idx_app_notifs_user_unread ON public.app_notifications(user_id, is_read);
            END IF;
        END IF;

        -- 2. Index on institution_id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_app_notifs_inst_id ON public.app_notifications(institution_id);
            
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'created_at'
            ) THEN
                CREATE INDEX IF NOT EXISTS idx_app_notifs_inst_created ON public.app_notifications(institution_id, created_at DESC);
            END IF;
        END IF;

        -- 3. Indexes for timestamp and created_at sorting
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'timestamp'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_app_notifs_timestamp ON public.app_notifications(timestamp DESC);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'created_at'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_app_notifs_created_at ON public.app_notifications(created_at DESC);
        END IF;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
