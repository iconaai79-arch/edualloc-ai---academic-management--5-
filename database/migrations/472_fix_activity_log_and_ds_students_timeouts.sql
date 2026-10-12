-- Migration: 472_fix_activity_log_and_ds_students_timeouts.sql
-- Description: Resolves two recurring API timeout warnings:
--   1. "[API GET] Timeout on 'activity_log' ordered query" — caused by missing composite
--      index on (institution_id, timestamp DESC) for tenant-scoped ordered reads.
--   2. "[API GET] Approaching safe limit, skipping retries for 'ds_students'" — caused by
--      missing (institution_id, id DESC) index, which is the default ORDER BY used when
--      the Direct PG fast-path falls back to PostgREST chunking.
--
-- Both warnings appear in api/records.ts when:
--   - activity_log: single-query path times out (finalLimit <= CHUNK_SIZE=250) on ordered fetch
--   - ds_students:  chunked path hits the 9s wall mid-pagination loop due to slow id-ordering

-- ============================================================
-- 1. ACTIVITY_LOG — Composite Covering Index for Tenant Reads
-- ============================================================
-- The API always filters by institution_id and orders by timestamp DESC.
-- A composite index (institution_id, timestamp DESC) satisfies both filter + sort in one
-- index scan, eliminating the sequential scan that causes the >5s timeout.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_inst_timestamp
    ON public.activity_log(institution_id, "timestamp" DESC);

-- Single-column fallback for queries without institution_id filter (super_admin global view)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_timestamp_desc
    ON public.activity_log("timestamp" DESC);

-- Secondary: filter by user for user-scoped audit trails
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_inst_user_timestamp
    ON public.activity_log(institution_id, user_id, "timestamp" DESC);

-- ============================================================
-- 2. DS_STUDENTS — id DESC Ordering Index for PostgREST Chunks
-- ============================================================
-- The API orders ds_students by id DESC (line 1582 in api/records.ts).
-- Without an index on id, every chunk in the pagination loop does a full sequential
-- scan + sort, burning through the 9s budget with even moderate row counts.
-- A composite (institution_id, id DESC) covers both the tenant filter and the sort.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ds_students_inst_id_desc
    ON public.ds_students(institution_id, id DESC);

-- Direct PG fast-path also uses institution_id + status; cover the common status filter too
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ds_students_inst_status_id
    ON public.ds_students(institution_id, status, id DESC);

-- ============================================================
-- 3. DS_LEADS — same id DESC pattern (also uses ORDER BY id DESC)
-- ============================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ds_leads_inst_id_desc
    ON public.ds_leads(institution_id, id DESC);

-- ============================================================
-- 4. Refresh query planner statistics
-- ============================================================
ANALYZE public.activity_log;
ANALYZE public.ds_students;
ANALYZE public.ds_leads;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
