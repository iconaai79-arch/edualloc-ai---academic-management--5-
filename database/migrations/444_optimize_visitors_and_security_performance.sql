-- Migration 444: Optimize visitors and security tables query performance and indexing
-- Eliminates chunk timeouts on visitors by establishing composite indexes with NULLS LAST ordering.

DO $$
BEGIN
    -- 1. Ensure created_at and updated_at exist on visitors
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visitors') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visitors' AND column_name = 'created_at') THEN
            ALTER TABLE public.visitors ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visitors' AND column_name = 'updated_at') THEN
            ALTER TABLE public.visitors ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;

        -- Create high-performance composite indexes
        CREATE INDEX IF NOT EXISTS idx_visitors_institution_id ON public.visitors(institution_id);
        CREATE INDEX IF NOT EXISTS idx_visitors_inst_created_desc ON public.visitors(institution_id, created_at DESC NULLS LAST);
        CREATE INDEX IF NOT EXISTS idx_visitors_inst_id_desc ON public.visitors(institution_id, id DESC);
        CREATE INDEX IF NOT EXISTS idx_visitors_inst_date ON public.visitors(institution_id, visit_date DESC);
    END IF;

    -- 2. Ensure building_visitor_logs is indexed
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'building_visitor_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'building_visitor_logs' AND column_name = 'created_at') THEN
            ALTER TABLE public.building_visitor_logs ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;

        CREATE INDEX IF NOT EXISTS idx_bvl_inst_created_desc ON public.building_visitor_logs(institution_id, created_at DESC NULLS LAST);
        CREATE INDEX IF NOT EXISTS idx_bvl_institution_id ON public.building_visitor_logs(institution_id);
    END IF;

    -- 3. Ensure security_alerts is indexed
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_alerts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_alerts' AND column_name = 'created_at') THEN
            ALTER TABLE public.security_alerts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;

        CREATE INDEX IF NOT EXISTS idx_sec_alerts_inst_created ON public.security_alerts(institution_id, created_at DESC NULLS LAST);
        CREATE INDEX IF NOT EXISTS idx_sec_alerts_inst_id ON public.security_alerts(institution_id);
    END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
