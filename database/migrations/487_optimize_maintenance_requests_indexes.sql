-- Migration 487: Optimize maintenance_requests table indexes and query performance
-- Resolves statement timeout (57014) on maintenance_requests queries

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'maintenance_requests'
    ) THEN
        -- Ensure required columns exist with appropriate defaults
        ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS room_id TEXT;
        ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';
        ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
        ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS reported_by TEXT;
        ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ELSE
        -- Create table if missing
        CREATE TABLE IF NOT EXISTS public.maintenance_requests (
            id TEXT PRIMARY KEY,
            institution_id TEXT,
            room_id TEXT,
            description TEXT,
            priority TEXT DEFAULT 'Medium',
            status TEXT DEFAULT 'Pending',
            reported_by TEXT,
            reported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- 1. Composite index for tenant-scoped id descending reads (used by API default ORDER BY id DESC)
CREATE INDEX IF NOT EXISTS idx_maint_requests_inst_id_desc 
    ON public.maintenance_requests(institution_id, id DESC);

-- 2. Composite index for tenant-scoped date descending reads
CREATE INDEX IF NOT EXISTS idx_maint_requests_inst_date_desc 
    ON public.maintenance_requests(institution_id, reported_at DESC);

-- 3. Composite index for tenant + status filtering
CREATE INDEX IF NOT EXISTS idx_maint_requests_inst_status 
    ON public.maintenance_requests(institution_id, status);

-- 4. Composite index for tenant + room lookup
CREATE INDEX IF NOT EXISTS idx_maint_requests_inst_room 
    ON public.maintenance_requests(institution_id, room_id);

-- 5. Single-column index on reported_at DESC
CREATE INDEX IF NOT EXISTS idx_maint_requests_reported_at 
    ON public.maintenance_requests(reported_at DESC);

-- 6. Enable RLS with permissive policies
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_requests_all_access" ON public.maintenance_requests;
CREATE POLICY "maintenance_requests_all_access" ON public.maintenance_requests
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 7. Grant access to all application roles
GRANT ALL ON public.maintenance_requests TO anon, authenticated, service_role;

-- 8. Analyze table to immediately update PostgreSQL query planner statistics
ANALYZE public.maintenance_requests;

-- 9. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
