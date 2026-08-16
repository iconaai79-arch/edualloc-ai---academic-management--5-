-- Migration 329: Create maintenance_requests table
-- Description: Stores facility and room maintenance requests, issue descriptions, priority levels, resolution statuses, and reporter logs.

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    room_id TEXT,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Pending',
    reported_by TEXT,
    reported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Backward compatibility column aliases
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS room_id TEXT;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS reported_by TEXT;
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_maint_requests_inst ON public.maintenance_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_maint_requests_room ON public.maintenance_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_maint_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maint_requests_date ON public.maintenance_requests(reported_at DESC);

-- Enable RLS
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies
DROP POLICY IF EXISTS "maintenance_requests_all_access" ON public.maintenance_requests;
CREATE POLICY "maintenance_requests_all_access" ON public.maintenance_requests
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant privileges
GRANT ALL ON public.maintenance_requests TO anon, authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
