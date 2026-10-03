-- Migration 451: Optimize integration_logs Ordered Query Indexes and Performance
-- Error: [API GET] Timeout on 'integration_logs' ordered query, retrying fast query...
-- Root cause:
--   1. PostgREST queries on integration_logs order by created_at DESC (and optionally id DESC).
--   2. In PostgreSQL, ORDER BY created_at DESC translates to NULLS LAST by default in PostgREST,
--      whereas standard B-tree index declarations (created_at DESC) default to NULLS FIRST.
--      This prevents the query planner from using the index for ordered scans.
--   3. When integration_logs grows with large JSONB payloads (webhooks, IPN callbacks),
--      sequential scans with in-memory sorts exceed the statement timeout (57014).
-- Fix:
--   1. Add composite index on (created_at DESC NULLS LAST, id DESC NULLS LAST) and (created_at DESC NULLS LAST).
--   2. Add composite index on (institution_id, created_at DESC NULLS LAST).
--   3. Add composite index on (provider, created_at DESC NULLS LAST) and (status, created_at DESC NULLS LAST).
--   4. Add partial index on created_at WHERE created_at IS NOT NULL.
--   5. Add BRIN index on created_at for fast chronological range pruning.
--   6. Set fillfactor = 90 on integration_logs to optimize append-only write performance.
--   7. Update planner statistics with ANALYZE and reload PostgREST schema cache.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'integration_logs'
    ) THEN
        RETURN; -- Table doesn't exist yet, skip
    END IF;

    -- Ensure institution_id index exists
    CREATE INDEX IF NOT EXISTS idx_integration_logs_inst_id 
        ON public.integration_logs(institution_id);

    -- 1. Primary fast-path composite index for ordered pagination: (created_at DESC NULLS LAST, id DESC NULLS LAST)
    CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at_id_nullslast 
        ON public.integration_logs(created_at DESC NULLS LAST, id DESC NULLS LAST);

    -- 2. Single-column index matching PostgREST ORDER BY created_at DESC
    CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at_nullslast 
        ON public.integration_logs(created_at DESC NULLS LAST);

    -- 3. Partial index for non-null created_at
    CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at_not_null 
        ON public.integration_logs(created_at DESC)
        WHERE created_at IS NOT NULL;

    -- 4. Institution-scoped chronological ordering index: (institution_id, created_at DESC NULLS LAST)
    CREATE INDEX IF NOT EXISTS idx_integration_logs_inst_created_nullslast 
        ON public.integration_logs(institution_id, created_at DESC NULLS LAST);

    -- 5. Provider-scoped index: (provider, created_at DESC NULLS LAST)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'integration_logs' AND column_name = 'provider'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_integration_logs_provider_created_nullslast 
            ON public.integration_logs(provider, created_at DESC NULLS LAST);
    END IF;

    -- 6. Status-scoped index: (status, created_at DESC NULLS LAST)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'integration_logs' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_integration_logs_status_created_nullslast 
            ON public.integration_logs(status, created_at DESC NULLS LAST);
    END IF;

    -- 7. Lightweight BRIN index on created_at for fast chronological range pruning
    CREATE INDEX IF NOT EXISTS idx_integration_logs_brin_created 
        ON public.integration_logs USING BRIN(created_at);

    -- 8. Reduce page fragmentation for high-throughput append logs
    ALTER TABLE public.integration_logs SET (fillfactor = 90);

    -- 9. Update PostgreSQL query planner statistics
    ANALYZE public.integration_logs;

END $$;

-- 10. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
