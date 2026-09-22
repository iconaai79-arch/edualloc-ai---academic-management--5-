-- Migration 420: Optimize visitors, security_alerts, building_visitor_logs, and watchlist_records indexes
-- Purpose: Provide high-performance composite B-tree indexes covering institution_id, created_at, id, status, and visit_date.
-- Eliminates PostgREST query chunk statement timeouts on 'visitors' and security modules.

DO $$
BEGIN
    -- 1. Ensure public.visitors table exists with all standard columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'visitors'
    ) THEN
        CREATE TABLE public.visitors (
            id                  TEXT PRIMARY KEY,
            institution_id      TEXT NOT NULL,
            "institutionId"     TEXT,
            name                TEXT,
            full_name           TEXT,
            "fullName"          TEXT,
            email               TEXT,
            phone_number        TEXT,
            "phoneNumber"       TEXT,
            host_phone          TEXT,
            notify_host_sms     BOOLEAN DEFAULT FALSE,
            purpose             TEXT,
            visit_date          DATE DEFAULT CURRENT_DATE,
            "visitDate"         TEXT,
            time_in             TEXT,
            "timeIn"            TEXT,
            time_out            TEXT,
            "timeOut"           TEXT,
            host_id             TEXT,
            "hostId"            TEXT,
            host_name           TEXT,
            "hostName"          TEXT,
            vehicle_plate       TEXT,
            "vehiclePlate"      TEXT,
            vehicle_model       TEXT,
            "vehicleModel"      TEXT,
            id_number           TEXT,
            "idNumber"          TEXT,
            check_in            TEXT,
            "checkIn"           TEXT,
            status              TEXT DEFAULT 'checked_in',
            metadata            JSONB DEFAULT '{}'::jsonb,
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "visitors_all" ON public.visitors;
        CREATE POLICY "visitors_all" ON public.visitors FOR ALL USING (true) WITH CHECK (true);
        GRANT ALL ON public.visitors TO anon, authenticated, service_role;
    END IF;

    -- Ensure notify_host_sms and host_phone columns exist on visitors if table was pre-existing
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

    -- 2. Ensure public.security_alerts table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'security_alerts'
    ) THEN
        CREATE TABLE public.security_alerts (
            id                  TEXT PRIMARY KEY,
            institution_id      TEXT NOT NULL,
            "institutionId"     TEXT,
            created_by          TEXT,
            "createdBy"         TEXT,
            status              TEXT DEFAULT 'active',
            target_id           TEXT,
            "targetId"          TEXT,
            target_name         TEXT,
            "targetName"        TEXT,
            target_role         TEXT,
            "targetRole"        TEXT,
            type                TEXT,
            severity            TEXT DEFAULT 'Medium',
            title               TEXT,
            description         TEXT,
            timestamp           TIMESTAMPTZ DEFAULT NOW(),
            metadata            JSONB DEFAULT '{}'::jsonb,
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "security_alerts_all" ON public.security_alerts;
        CREATE POLICY "security_alerts_all" ON public.security_alerts FOR ALL USING (true) WITH CHECK (true);
        GRANT ALL ON public.security_alerts TO anon, authenticated, service_role;
    END IF;

    -- 3. Ensure public.building_visitor_logs table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'building_visitor_logs'
    ) THEN
        CREATE TABLE public.building_visitor_logs (
            id                  TEXT PRIMARY KEY,
            institution_id      TEXT NOT NULL,
            "institutionId"     TEXT,
            visitor_id          TEXT,
            "visitorId"         TEXT,
            building_id         TEXT,
            "buildingId"        TEXT,
            check_in_time       TIMESTAMPTZ DEFAULT NOW(),
            check_out_time      TIMESTAMPTZ,
            status              TEXT DEFAULT 'active',
            metadata            JSONB DEFAULT '{}'::jsonb,
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE public.building_visitor_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "building_visitor_logs_all" ON public.building_visitor_logs;
        CREATE POLICY "building_visitor_logs_all" ON public.building_visitor_logs FOR ALL USING (true) WITH CHECK (true);
        GRANT ALL ON public.building_visitor_logs TO anon, authenticated, service_role;
    END IF;

    -- 4. Ensure public.watchlist_records table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'watchlist_records'
    ) THEN
        CREATE TABLE public.watchlist_records (
            id                  TEXT PRIMARY KEY,
            institution_id      TEXT NOT NULL,
            "institutionId"     TEXT,
            name                TEXT,
            id_number           TEXT,
            "idNumber"          TEXT,
            phone_number        TEXT,
            "phoneNumber"       TEXT,
            reason              TEXT,
            severity            TEXT DEFAULT 'Medium',
            status              TEXT DEFAULT 'active',
            metadata            JSONB DEFAULT '{}'::jsonb,
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE public.watchlist_records ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "watchlist_records_all" ON public.watchlist_records;
        CREATE POLICY "watchlist_records_all" ON public.watchlist_records FOR ALL USING (true) WITH CHECK (true);
        GRANT ALL ON public.watchlist_records TO anon, authenticated, service_role;
    END IF;

    -- 5. Indexes on public.visitors
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'visitors'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'visitors' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_visitors_institution 
                ON public.visitors (institution_id);
            CREATE INDEX IF NOT EXISTS idx_visitors_inst_created_at 
                ON public.visitors (institution_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_visitors_inst_id_composite 
                ON public.visitors (institution_id, id DESC);
            CREATE INDEX IF NOT EXISTS idx_visitors_inst_status 
                ON public.visitors (institution_id, status);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'visitors' AND column_name = 'visit_date'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_visitors_inst_visit_date 
                ON public.visitors (institution_id, visit_date DESC);
        END IF;
    END IF;

    -- 6. Indexes on public.security_alerts
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'security_alerts'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'security_alerts' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_security_alerts_institution 
                ON public.security_alerts (institution_id);
            CREATE INDEX IF NOT EXISTS idx_security_alerts_inst_created_at 
                ON public.security_alerts (institution_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_security_alerts_inst_id_composite 
                ON public.security_alerts (institution_id, id DESC);
            CREATE INDEX IF NOT EXISTS idx_security_alerts_inst_status 
                ON public.security_alerts (institution_id, status);
        END IF;
    END IF;

    -- 7. Indexes on public.building_visitor_logs
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'building_visitor_logs'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'building_visitor_logs' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_building_visitor_logs_institution 
                ON public.building_visitor_logs (institution_id);
            CREATE INDEX IF NOT EXISTS idx_building_visitor_logs_inst_created_at 
                ON public.building_visitor_logs (institution_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_building_visitor_logs_inst_id_composite 
                ON public.building_visitor_logs (institution_id, id DESC);
        END IF;
    END IF;

    -- 8. Indexes on public.watchlist_records
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'watchlist_records'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'watchlist_records' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_watchlist_records_institution 
                ON public.watchlist_records (institution_id);
            CREATE INDEX IF NOT EXISTS idx_watchlist_records_inst_created_at 
                ON public.watchlist_records (institution_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_watchlist_records_inst_id_composite 
                ON public.watchlist_records (institution_id, id DESC);
        END IF;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
