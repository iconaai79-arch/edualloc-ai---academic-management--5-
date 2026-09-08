-- Migration 377: Optimize visitors and security logs indexes for high-speed queries
-- Description: Adds B-Tree composite indexes on public.visitors and security log tables to accelerate institution isolation, RLS evaluation, and paginated sorting.

-- 1. Visitors indexes
CREATE INDEX IF NOT EXISTS idx_visitors_institution_id ON public.visitors(institution_id);
CREATE INDEX IF NOT EXISTS idx_visitors_inst_created_desc ON public.visitors(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_inst_visit_date ON public.visitors(institution_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON public.visitors(institution_id, status);

-- 2. Security alerts indexes
CREATE INDEX IF NOT EXISTS idx_security_alerts_institution_id ON public.security_alerts(institution_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_inst_created ON public.security_alerts(institution_id, created_at DESC);

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
