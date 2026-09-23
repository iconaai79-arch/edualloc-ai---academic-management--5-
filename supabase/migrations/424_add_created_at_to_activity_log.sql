-- 424_add_created_at_to_activity_log.sql
-- Add created_at column to activity_log if it doesn't exist, backfill from timestamp

ALTER TABLE IF EXISTS public.activity_log 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill created_at from timestamp where created_at is null
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'activity_log' 
          AND column_name = 'timestamp'
    ) THEN
        UPDATE public.activity_log 
        SET created_at = COALESCE(timestamp, NOW())
        WHERE created_at IS NULL;
    END IF;
END $$;

-- Create indexes on created_at and timestamp for fast ordering/filtering
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at_desc ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp_desc ON public.activity_log (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_inst_created_at ON public.activity_log (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_inst_timestamp ON public.activity_log (institution_id, timestamp DESC);
