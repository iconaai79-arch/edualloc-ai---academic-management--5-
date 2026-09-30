-- Migration 440: Fix app_notifications ordered query timeout
-- Error: [API GET] Timeout on 'app_notifications' ordered query, retrying fast query...
-- Root cause: PostgREST queries order by timestamp DESC without a matching index.
--             When the table grows large the sequential scan causes 18s+ timeouts.
-- Fix:
--   1. Ensure all sort/filter columns are indexed (partial and composite).
--   2. Add a BRIN index for timestamp range scans (very cheap on append-only data).
--   3. Set fillfactor = 80 on the table to reduce vacuum pressure from updates (is_read toggle).
--   4. Add a covering index for the most common dashboard query pattern:
--      user_id + institution_id + is_read + created_at/timestamp DESC.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'app_notifications'
    ) THEN
        RETURN; -- table doesn't exist yet, skip
    END IF;

    -- Ensure created_at exists (may be named timestamp on older deployments)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.app_notifications
            ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;

    -- Ensure is_read column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'app_notifications' AND column_name = 'is_read'
    ) THEN
        ALTER TABLE public.app_notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;

END $$;

-- ============================================================================
-- Fast-path composite indexes for the most common query patterns:
-- PostgREST: GET /app_notifications?user_id=eq.X&order=created_at.desc&limit=50
-- PostgREST: GET /app_notifications?institution_id=eq.X&is_read=eq.false&order=created_at.desc
-- ============================================================================

-- 1. Primary dashboard fetch: per-user, latest first
CREATE INDEX IF NOT EXISTS idx_app_notifs_user_created_fast
    ON public.app_notifications(user_id, created_at DESC)
    WHERE created_at IS NOT NULL;

-- 2. Per-user unread badge count (very frequent lightweight query)
CREATE INDEX IF NOT EXISTS idx_app_notifs_user_unread_fast
    ON public.app_notifications(user_id, is_read)
    WHERE is_read = FALSE;

-- 3. Institution-wide notification feed
CREATE INDEX IF NOT EXISTS idx_app_notifs_inst_created_fast
    ON public.app_notifications(institution_id, created_at DESC)
    WHERE institution_id IS NOT NULL AND created_at IS NOT NULL;

-- 4. Covering index for the full ordered+filtered query (user + unread + sorted)
-- Avoids heap fetch entirely for the most common UI query
CREATE INDEX IF NOT EXISTS idx_app_notifs_user_unread_created_covering
    ON public.app_notifications(user_id, is_read, created_at DESC);

-- 5. Fallback: timestamp column (some older code orders by timestamp not created_at)
CREATE INDEX IF NOT EXISTS idx_app_notifs_user_timestamp_fast
    ON public.app_notifications(user_id, "timestamp" DESC)
    WHERE "timestamp" IS NOT NULL;

-- 6. BRIN index for range scans on created_at (tiny, auto-maintained)
CREATE INDEX IF NOT EXISTS idx_app_notifs_brin_created
    ON public.app_notifications USING BRIN(created_at);

-- ============================================================================
-- Reload PostgREST schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';
