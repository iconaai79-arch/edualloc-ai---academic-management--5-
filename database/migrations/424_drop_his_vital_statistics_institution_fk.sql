-- Migration 424: Make his_vital_statistics resilient for demo & sandbox institutions
-- Description: Drops the rigid foreign key constraint on institution_id on his_vital_statistics 
-- so that demonstration, offline, and sandbox clinics can record vital signs without blocking FK constraint failures.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid::regclass::text IN ('his_vital_statistics', 'public.his_vital_statistics')
          AND contype = 'f'
          AND (conname LIKE '%institution%' OR conname = 'his_vital_statistics_institution_id_fkey')
    ) LOOP
        EXECUTE 'ALTER TABLE public.his_vital_statistics DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE;';
    END LOOP;
END $$;

-- Ensure index exists for performant queries
CREATE INDEX IF NOT EXISTS idx_his_vital_stats_inst ON public.his_vital_statistics (institution_id);

-- Ensure trend column exists if supplied or queried by client components
ALTER TABLE public.his_vital_statistics ADD COLUMN IF NOT EXISTS trend TEXT;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
