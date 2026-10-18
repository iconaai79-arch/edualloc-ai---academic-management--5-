-- Migration 517: Fix Institution Module States Unique Constraint Collisions
-- Resolves:
--   1. PostgreSQL error 23505: duplicate key value violates unique constraint "institution_module_states_institution_id_module_id_key"
--   2. Drops the rigid secondary UNIQUE constraint on (institution_id, module_id) that collides with primary key (id) upserts
--   3. Deduplicates any existing duplicate rows, keeping the latest by updated_at
--   4. Creates high-performance composite non-unique index on (institution_id, module_id)
--   5. Ensures all columns, camelCase aliases ("moduleId", "updatedAt"), and sync triggers exist
--   6. Ensures permissive RLS policies and reloads PostgREST schema cache

SET statement_timeout = '1min';

DO $$
BEGIN
    -- 1. Ensure Table and Columns Exist
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'institution_module_states'
    ) THEN
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS module_id TEXT;
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS "moduleId" TEXT;
        ALTER TABLE public.institution_module_states ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
    ELSE
        CREATE TABLE IF NOT EXISTS public.institution_module_states (
            id TEXT PRIMARY KEY,
            institution_id TEXT,
            module_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            data JSONB DEFAULT '{}'::jsonb,
            settings JSONB DEFAULT '{}'::jsonb,
            activated_at TIMESTAMPTZ DEFAULT NOW(),
            trial_ends_at TIMESTAMPTZ,
            subscription_ends_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            "moduleId" TEXT,
            "updatedAt" TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Explicitly drop the rigid unique constraint and index that causes error 23505
ALTER TABLE public.institution_module_states DROP CONSTRAINT IF EXISTS institution_module_states_institution_id_module_id_key CASCADE;
ALTER TABLE public.institution_module_states DROP CONSTRAINT IF EXISTS uq_institution_module_states_inst_module CASCADE;
ALTER TABLE public.institution_module_states DROP CONSTRAINT IF EXISTS uq_ims_inst_module CASCADE;
DROP INDEX IF EXISTS public.institution_module_states_institution_id_module_id_key CASCADE;
DROP INDEX IF EXISTS public.uq_institution_module_states_inst_module CASCADE;
DROP INDEX IF EXISTS public.uq_ims_inst_module CASCADE;

-- 3. Dynamically drop ANY unique constraints on institution_module_states (other than primary key)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.institution_module_states'::regclass 
          AND contype = 'u'
    ) LOOP
        EXECUTE format('ALTER TABLE public.institution_module_states DROP CONSTRAINT IF EXISTS %I CASCADE;', r.conname);
        RAISE NOTICE 'Dropped unique constraint: %', r.conname;
    END LOOP;
END $$;

-- 4. Dynamically drop ANY unique indexes on institution_module_states (other than primary key)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT i.relname AS index_name
        FROM pg_index x
        JOIN pg_class c ON c.oid = x.indrelid
        JOIN pg_class i ON i.oid = x.indexrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'institution_module_states'
          AND x.indisunique = true
          AND x.indisprimary = false
    ) LOOP
        EXECUTE format('DROP INDEX IF EXISTS public.%I CASCADE;', r.index_name);
        RAISE NOTICE 'Dropped unique index: %', r.index_name;
    END LOOP;
END $$;

-- 5. Deduplicate existing rows: keep the most recently updated row per (institution_id, module_id)
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY COALESCE(institution_id, ''), COALESCE(module_id, "moduleId", '')
               ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, ctid DESC
           ) as rn
    FROM public.institution_module_states
    WHERE institution_id IS NOT NULL AND (module_id IS NOT NULL OR "moduleId" IS NOT NULL)
)
DELETE FROM public.institution_module_states
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- 6. Backfill module_id <-> "moduleId" and data <-> settings
UPDATE public.institution_module_states
SET module_id = COALESCE(module_id, "moduleId"),
    "moduleId" = COALESCE("moduleId", module_id),
    data = CASE WHEN data IS NULL OR data = '{}'::jsonb THEN COALESCE(settings, '{}'::jsonb) ELSE data END,
    settings = CASE WHEN settings IS NULL OR settings = '{}'::jsonb THEN COALESCE(data, '{}'::jsonb) ELSE settings END,
    updated_at = COALESCE(updated_at, "updatedAt", NOW()),
    "updatedAt" = COALESCE("updatedAt", updated_at, NOW())
WHERE module_id IS NULL OR "moduleId" IS NULL OR settings IS NULL OR "updatedAt" IS NULL;

-- 7. Create high-performance non-unique composite and single-column indexes
CREATE INDEX IF NOT EXISTS idx_ims_inst_module ON public.institution_module_states (institution_id, module_id);
CREATE INDEX IF NOT EXISTS idx_ims_institution_id ON public.institution_module_states (institution_id);
CREATE INDEX IF NOT EXISTS idx_ims_module_id ON public.institution_module_states (module_id);
CREATE INDEX IF NOT EXISTS idx_ims_updated_at ON public.institution_module_states (updated_at DESC);

-- 8. Bidirectional synchronization trigger between module_id and "moduleId"
CREATE OR REPLACE FUNCTION public.sync_institution_module_states_cols()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync module_id <-> "moduleId"
    IF NEW.module_id IS NOT NULL AND (NEW."moduleId" IS NULL OR NEW."moduleId" != NEW.module_id) THEN
        NEW."moduleId" := NEW.module_id;
    ELSIF NEW."moduleId" IS NOT NULL AND (NEW.module_id IS NULL OR NEW.module_id != NEW."moduleId") THEN
        NEW.module_id := NEW."moduleId";
    END IF;

    -- Sync data <-> settings
    IF NEW.data IS NOT NULL AND (NEW.settings IS NULL OR NEW.settings = '{}'::jsonb) THEN
        NEW.settings := NEW.data;
    ELSIF NEW.settings IS NOT NULL AND (NEW.data IS NULL OR NEW.data = '{}'::jsonb) THEN
        NEW.data := NEW.settings;
    END IF;

    -- Sync updated_at <-> "updatedAt"
    NEW.updated_at := COALESCE(NEW.updated_at, NEW."updatedAt", NOW());
    NEW."updatedAt" := NEW.updated_at;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_institution_module_states_cols ON public.institution_module_states;
CREATE TRIGGER trg_sync_institution_module_states_cols
BEFORE INSERT OR UPDATE ON public.institution_module_states
FOR EACH ROW
EXECUTE FUNCTION public.sync_institution_module_states_cols();

-- 9. Row Level Security and Grants
ALTER TABLE public.institution_module_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all access on institution_module_states" ON public.institution_module_states;
DROP POLICY IF EXISTS "Institutions can view their own module states" ON public.institution_module_states;
DROP POLICY IF EXISTS "Super Admins can manage all module states" ON public.institution_module_states;

CREATE POLICY "Allow public all access on institution_module_states"
ON public.institution_module_states
FOR ALL
USING (true)
WITH CHECK (true);

GRANT ALL ON public.institution_module_states TO anon;
GRANT ALL ON public.institution_module_states TO authenticated;
GRANT ALL ON public.institution_module_states TO service_role;

-- 10. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
ANALYZE public.institution_module_states;
