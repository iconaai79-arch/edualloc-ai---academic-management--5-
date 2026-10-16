-- Migration 500: Optimize vehicles, transport_onboarding, vehicle_logs, and ds_vehicles Indexes, Resilience, and RLS
-- Resolves statement timeout (57014) on vehicles and transport queries
--
-- 1. Ensure public.vehicles, public.transport_onboarding, public.vehicle_logs, and public.ds_vehicles exist with proper columns and defaults
-- 2. Drop any lock-prone foreign keys referencing vehicles or transport tables to eliminate deadlock and table lock contention
-- 3. Create high-performance composite indexes for multi-tenant queries, sorting, and pagination
-- 4. Apply master permissive RLS policies for public, anon, authenticated, and service_role
-- 5. Grant explicit permissions, analyze statistics, and notify PostgREST schema cache reload

SET statement_timeout = '1min';

DO $$
BEGIN
    -- 1. Ensure Table and Columns Exist for vehicles
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'vehicles'
    ) THEN
        ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS id TEXT;
        ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS plate_number TEXT;
        ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS model TEXT;
        ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'school';
        ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 14;
        ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS driver_id TEXT;
        ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS assistant_id TEXT;
        ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
        ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ELSE
        CREATE TABLE IF NOT EXISTS public.vehicles (
            id TEXT PRIMARY KEY,
            institution_id TEXT NOT NULL,
            plate_number TEXT NOT NULL,
            model TEXT,
            vehicle_type TEXT DEFAULT 'school',
            capacity INTEGER DEFAULT 14,
            driver_id TEXT,
            assistant_id TEXT,
            status TEXT DEFAULT 'active',
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Ensure Table and Columns Exist for transport_onboarding
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'transport_onboarding'
    ) THEN
        ALTER TABLE public.transport_onboarding ADD COLUMN IF NOT EXISTS id TEXT;
        ALTER TABLE public.transport_onboarding ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.transport_onboarding ADD COLUMN IF NOT EXISTS vehicle_id TEXT;
        ALTER TABLE public.transport_onboarding ADD COLUMN IF NOT EXISTS student_id TEXT;
        ALTER TABLE public.transport_onboarding ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'to_school';
        ALTER TABLE public.transport_onboarding ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
        ALTER TABLE public.transport_onboarding ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
        ALTER TABLE public.transport_onboarding ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
        ALTER TABLE public.transport_onboarding ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.transport_onboarding ADD COLUMN IF NOT EXISTS parent_confirmed_at TIMESTAMPTZ;
        ALTER TABLE public.transport_onboarding ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.transport_onboarding ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.transport_onboarding ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ELSE
        CREATE TABLE IF NOT EXISTS public.transport_onboarding (
            id TEXT PRIMARY KEY,
            institution_id TEXT NOT NULL,
            vehicle_id TEXT,
            student_id TEXT,
            direction TEXT DEFAULT 'to_school',
            status TEXT DEFAULT 'pending',
            location_lat DOUBLE PRECISION,
            location_lng DOUBLE PRECISION,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            parent_confirmed_at TIMESTAMPTZ,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Ensure Table and Columns Exist for vehicle_logs
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'vehicle_logs'
    ) THEN
        ALTER TABLE public.vehicle_logs ADD COLUMN IF NOT EXISTS id TEXT;
        ALTER TABLE public.vehicle_logs ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.vehicle_logs ADD COLUMN IF NOT EXISTS vehicle_id TEXT;
        ALTER TABLE public.vehicle_logs ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'entry';
        ALTER TABLE public.vehicle_logs ADD COLUMN IF NOT EXISTS security_id TEXT;
        ALTER TABLE public.vehicle_logs ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE public.vehicle_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.vehicle_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.vehicle_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.vehicle_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ELSE
        CREATE TABLE IF NOT EXISTS public.vehicle_logs (
            id TEXT PRIMARY KEY,
            institution_id TEXT NOT NULL,
            vehicle_id TEXT,
            event_type TEXT DEFAULT 'entry',
            security_id TEXT,
            notes TEXT,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Ensure Table and Columns Exist for ds_vehicles
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ds_vehicles'
    ) THEN
        ALTER TABLE public.ds_vehicles ADD COLUMN IF NOT EXISTS id TEXT;
        ALTER TABLE public.ds_vehicles ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.ds_vehicles ADD COLUMN IF NOT EXISTS plate_number TEXT;
        ALTER TABLE public.ds_vehicles ADD COLUMN IF NOT EXISTS model TEXT;
        ALTER TABLE public.ds_vehicles ADD COLUMN IF NOT EXISTS make TEXT;
        ALTER TABLE public.ds_vehicles ADD COLUMN IF NOT EXISTS transmission TEXT DEFAULT 'Manual';
        ALTER TABLE public.ds_vehicles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
        ALTER TABLE public.ds_vehicles ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 4;
        ALTER TABLE public.ds_vehicles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.ds_vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ELSE
        CREATE TABLE IF NOT EXISTS public.ds_vehicles (
            id TEXT PRIMARY KEY,
            institution_id TEXT NOT NULL,
            plate_number TEXT NOT NULL,
            model TEXT,
            make TEXT,
            transmission TEXT DEFAULT 'Manual',
            status TEXT DEFAULT 'active',
            capacity INTEGER DEFAULT 4,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Drop any lock-prone foreign keys referencing vehicles or transport tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname, conrelid::regclass::text as tablename
        FROM   pg_constraint
        WHERE  (conrelid IN ('public.vehicles'::regclass, 'public.transport_onboarding'::regclass, 'public.vehicle_logs'::regclass, 'public.ds_vehicles'::regclass)
                OR confrelid IN ('public.vehicles'::regclass, 'public.transport_onboarding'::regclass, 'public.vehicle_logs'::regclass, 'public.ds_vehicles'::regclass))
        AND contype = 'f'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I CASCADE;', r.tablename, r.conname);
            RAISE NOTICE 'Dropped FK % from %', r.conname, r.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop FK % from %: %', r.conname, r.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- 3. High-performance composite and tenancy indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_institution_id 
    ON public.vehicles(institution_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_inst_id_desc 
    ON public.vehicles(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_vehicles_inst_id_asc 
    ON public.vehicles(institution_id, id ASC);

CREATE INDEX IF NOT EXISTS idx_vehicles_inst_plate 
    ON public.vehicles(institution_id, plate_number);

CREATE INDEX IF NOT EXISTS idx_vehicles_inst_status 
    ON public.vehicles(institution_id, status);

CREATE INDEX IF NOT EXISTS idx_vehicles_inst_driver 
    ON public.vehicles(institution_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_inst_created 
    ON public.vehicles(institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_id_desc 
    ON public.transport_onboarding(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_timestamp 
    ON public.transport_onboarding(institution_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_student 
    ON public.transport_onboarding(institution_id, student_id);

CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_vehicle 
    ON public.transport_onboarding(institution_id, vehicle_id);

CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_created 
    ON public.transport_onboarding(institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_logs_inst_id_desc 
    ON public.vehicle_logs(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_logs_inst_timestamp 
    ON public.vehicle_logs(institution_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_logs_inst_vehicle 
    ON public.vehicle_logs(institution_id, vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_logs_inst_created 
    ON public.vehicle_logs(institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ds_vehicles_inst_id_desc 
    ON public.ds_vehicles(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_ds_vehicles_inst_plate 
    ON public.ds_vehicles(institution_id, plate_number);

CREATE INDEX IF NOT EXISTS idx_ds_vehicles_inst_status 
    ON public.ds_vehicles(institution_id, status);

CREATE INDEX IF NOT EXISTS idx_ds_vehicles_inst_created 
    ON public.ds_vehicles(institution_id, created_at DESC);

-- 4. Enable RLS and establish master permissive policies
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ds_vehicles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename IN ('vehicles', 'transport_onboarding', 'vehicle_logs', 'ds_vehicles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

CREATE POLICY "vehicles_all_access" ON public.vehicles
    FOR ALL
    TO public, anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "transport_onboarding_all_access" ON public.transport_onboarding
    FOR ALL
    TO public, anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "vehicle_logs_all_access" ON public.vehicle_logs
    FOR ALL
    TO public, anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "ds_vehicles_all_access" ON public.ds_vehicles
    FOR ALL
    TO public, anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 5. Explicit Grants to all application roles
GRANT ALL ON public.vehicles TO anon, authenticated, service_role;
GRANT ALL ON public.transport_onboarding TO anon, authenticated, service_role;
GRANT ALL ON public.vehicle_logs TO anon, authenticated, service_role;
GRANT ALL ON public.ds_vehicles TO anon, authenticated, service_role;

-- 6. Update PostgreSQL query planner statistics
ANALYZE public.vehicles;
ANALYZE public.transport_onboarding;
ANALYZE public.vehicle_logs;
ANALYZE public.ds_vehicles;

-- 7. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
