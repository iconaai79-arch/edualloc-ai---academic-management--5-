-- Migration 377: Ensure created_at columns and optimize visitors and security logs indexes
-- Description: Ensures created_at exists on visitors and security_alerts, and adds B-Tree composite indexes for high-speed queries, RLS evaluation, and paginated sorting.

-- 1. Ensure created_at and timestamp columns exist on visitors & security_alerts
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Visitors indexes
CREATE INDEX IF NOT EXISTS idx_visitors_institution_id ON public.visitors(institution_id);
CREATE INDEX IF NOT EXISTS idx_visitors_inst_created_desc ON public.visitors(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_inst_visit_date ON public.visitors(institution_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON public.visitors(institution_id, status);

-- 3. Security alerts indexes
CREATE INDEX IF NOT EXISTS idx_security_alerts_institution_id ON public.security_alerts(institution_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_inst_created ON public.security_alerts(institution_id, created_at DESC);

-- 4. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
