-- Migration 489: Optimize requisitions indexes and query performance
-- Resolves statement timeout (57014) on requisitions queries

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'requisitions'
    ) THEN
        -- Ensure required columns exist
        ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS requested_by TEXT;
        ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS requested_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS total_estimated_cost DECIMAL(15, 2);
        ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_approval';
        ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS supplier_id TEXT;
        ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS lpo_number TEXT;
        ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS store_id TEXT;
        ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ELSE
        -- Create table if missing
        CREATE TABLE IF NOT EXISTS public.requisitions (
            id TEXT PRIMARY KEY,
            institution_id TEXT NOT NULL,
            requested_by TEXT,
            requested_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            items JSONB DEFAULT '[]'::jsonb,
            total_estimated_cost DECIMAL(15, 2),
            status TEXT DEFAULT 'pending_approval',
            supplier_id TEXT,
            lpo_number TEXT,
            rejection_reason TEXT,
            store_id TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- 1. Composite index for tenant-scoped id descending reads (default API ordering)
CREATE INDEX IF NOT EXISTS idx_requisitions_inst_id_desc 
    ON public.requisitions(institution_id, id DESC);

-- 2. Composite index for tenant-scoped status filtering
CREATE INDEX IF NOT EXISTS idx_requisitions_inst_status 
    ON public.requisitions(institution_id, status);

-- 3. Composite index for tenant-scoped date descending reads
CREATE INDEX IF NOT EXISTS idx_requisitions_inst_date 
    ON public.requisitions(institution_id, requested_date DESC);

-- 4. Composite index for store-level requisitions
CREATE INDEX IF NOT EXISTS idx_requisitions_inst_store 
    ON public.requisitions(institution_id, store_id);

-- 5. Composite index for supplier-linked requisitions
CREATE INDEX IF NOT EXISTS idx_requisitions_inst_supplier 
    ON public.requisitions(institution_id, supplier_id);

-- 6. Enable RLS with permissive master unblock policy
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requisitions_all_access" ON public.requisitions;
DROP POLICY IF EXISTS "master_unblock_requisitions" ON public.requisitions;

CREATE POLICY "requisitions_all_access" ON public.requisitions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 7. Grant access to all application roles
GRANT ALL ON public.requisitions TO anon, authenticated, service_role;

-- 8. Analyze table to immediately update PostgreSQL query planner statistics
ANALYZE public.requisitions;

-- 9. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
