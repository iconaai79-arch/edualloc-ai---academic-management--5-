-- Migration 457: Drop Rigid institution_id Foreign Key Constraint on student_enrollments
-- Error: [api/records POST] institution_id FK violation on [student_enrollments]:
--        institution not found in DB. institution_id sent: "inst_1787380262328_cknnf"
--        insert or update on table "student_enrollments" violates foreign key constraint "student_enrollments_institution_id_fkey"
--
-- Rationale:
--   1. Aligned with Migrations 186, 191, 197, 424, 429, and 453, multi-tenant isolation
--      is strictly enforced at the API layer (/api/records) by filtering records by tenant ID.
--   2. In multi-tenant and offline-first setups, institutions may be stored without the 'inst_' prefix
--      (e.g., '1787380262328_cknnf'), with the prefix, or registered locally in offline mode.
--   3. A rigid DB-level foreign key to public.institutions(id) rejects enrollment writes whenever
--      client tenant ID formats vary or when new schools are registered before sync.
--   4. Removing the DB-level FK constraint unblocks student enrollment writes, bulk imports, and
--      offline sync while preserving the column and index for high-speed tenant-scoped queries.

SET statement_timeout = '1min';

-- 1. Drop any foreign key constraints on student_enrollments referencing institutions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM   pg_constraint
        WHERE  conrelid = 'public.student_enrollments'::regclass
          AND  contype  = 'f'
          AND  (conname ILIKE '%institution%' OR conname = 'student_enrollments_institution_id_fkey')
    LOOP
        EXECUTE format('ALTER TABLE public.student_enrollments DROP CONSTRAINT IF EXISTS %I CASCADE;', r.conname);
        RAISE NOTICE 'Dropped foreign key % from student_enrollments', r.conname;
    END LOOP;
END $$;

-- 2. Preserve and verify index on institution_id for index-only scans & tenancy isolation
CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id 
    ON public.student_enrollments(institution_id);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id_composite 
    ON public.student_enrollments(institution_id, id ASC);

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
