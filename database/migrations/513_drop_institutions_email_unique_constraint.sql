-- Migration 513: Drop Rigid institutions_email_key Unique Constraint & Relax NOT NULL Constraint
-- Resolves:
--   1. PostgreSQL error 23502 (null value in column "email" of relation "institutions" violates not-null constraint)
--   2. PostgreSQL error 23505 (duplicate key value violates unique constraint "institutions_email_key")
--
-- 1. Relax NOT NULL constraint on institutions.email so branch campuses, satellite sites,
--    and offline modules are not forced to have unique/distinct emails.
-- 2. Explicitly drop legacy unique constraints on institutions.email
-- 3. Dynamically find and drop any unique constraint on public.institutions covering the email column
-- 4. Dynamically find and drop any standalone unique index on public.institutions covering the email column
-- 5. Normalize empty string or whitespace emails to NULL (completely safe now that NOT NULL is dropped)
-- 6. Ensure high-performance standard non-unique B-tree index exists on email for fast lookups
-- 7. Update statistics and reload PostgREST schema cache

SET statement_timeout = '1min';

-- 1. Relax NOT NULL constraint on public.institutions.email
DO $$
BEGIN
    ALTER TABLE public.institutions ALTER COLUMN email DROP NOT NULL;
    RAISE NOTICE 'Successfully dropped NOT NULL constraint on public.institutions.email';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notice: Altering column email on institutions table: %', SQLERRM;
END $$;

-- 2. Explicitly drop legacy unique constraints on institutions.email
ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_email_key CASCADE;
ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_email_unique CASCADE;
ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS uq_institutions_email CASCADE;

-- 3. Dynamically drop any remaining unique constraints on institutions covering email
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname, conrelid::regclass::text as tablename
        FROM   pg_constraint
        WHERE  conrelid = 'public.institutions'::regclass
        AND contype = 'u'
        AND conname ILIKE '%email%'
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I CASCADE;', r.tablename, r.conname);
        RAISE NOTICE 'Dropped unique constraint % from %', r.conname, r.tablename;
    END LOOP;
END $$;

-- 4. Dynamically drop any standalone unique indexes on institutions covering email
DO $$
DECLARE
    idx_rec RECORD;
BEGIN
    FOR idx_rec IN
        SELECT i.relname AS index_name
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = 'institutions'
          AND t.relnamespace = 'public'::regnamespace
          AND ix.indisunique = true
          AND a.attname = 'email'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS public.%I CASCADE;', idx_rec.index_name);
        RAISE NOTICE 'Dropped unique index % on public.institutions(email)', idx_rec.index_name;
    END LOOP;
END $$;

-- Explicitly drop well-known index names if present
DROP INDEX IF EXISTS public.institutions_email_key;
DROP INDEX IF EXISTS public.idx_institutions_email_unique;
DROP INDEX IF EXISTS public.uq_institutions_email_idx;

-- 5. Normalize empty string or whitespace emails to NULL (safe since NOT NULL constraint was dropped in Step 1)
UPDATE public.institutions 
SET email = NULL 
WHERE email IS NOT NULL AND TRIM(email) = '';

-- 6. Ensure high-performance standard non-unique B-tree index on email
CREATE INDEX IF NOT EXISTS idx_institutions_email ON public.institutions(email);

-- 7. Update PostgreSQL query planner statistics & reload schema
ANALYZE public.institutions;
NOTIFY pgrst, 'reload schema';

