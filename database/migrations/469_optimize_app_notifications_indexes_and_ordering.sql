-- Migration 469: Optimize app_notifications indexes and ordering performance
-- Resolves statement timeout (57014) on app_notifications queries

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_notifications') THEN
        -- Ensure timestamp and created_at columns exist
        ALTER TABLE public.app_notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE public.app_notifications ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE public.app_notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- High performance composite and covering indexes for notification retrieval
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_id ON public.app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_app_notifications_institution_id ON public.app_notifications(institution_id);
CREATE INDEX IF NOT EXISTS idx_app_notifications_created_at ON public.app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_timestamp ON public.app_notifications(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_timestamp ON public.app_notifications(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_inst_timestamp ON public.app_notifications(institution_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_created ON public.app_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_inst_created ON public.app_notifications(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_id ON public.app_notifications(id);

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
