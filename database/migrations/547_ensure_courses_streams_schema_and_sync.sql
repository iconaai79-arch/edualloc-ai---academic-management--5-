-- Migration 547: Ensure courses & streams schema with bidirectional sync
-- Fixes issue where courses table only has "institutionId" or institution_id, causing stream saves on Finance to fail

DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS public.courses (
        id TEXT PRIMARY KEY DEFAULT ('crs_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20)),
        name TEXT,
        code TEXT,
        institution_id TEXT,
        "institutionId" TEXT,
        department_id TEXT,
        "departmentId" TEXT,
        academic_level_id TEXT,
        "academicLevelId" TEXT,
        short_name TEXT,
        "shortName" TEXT,
        curriculum_type TEXT,
        "curriculumType" TEXT,
        schedule_profile_id TEXT,
        "scheduleProfileId" TEXT,
        levels JSONB DEFAULT '[]'::jsonb,
        streams JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS institution_id TEXT;
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS department_id TEXT;
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS academic_level_id TEXT;
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "academicLevelId" TEXT;
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS short_name TEXT;
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "shortName" TEXT;
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS curriculum_type TEXT;
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "curriculumType" TEXT;
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS schedule_profile_id TEXT;
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS "scheduleProfileId" TEXT;
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS levels JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS streams JSONB DEFAULT '[]'::jsonb;

    -- Synchronize existing values
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'institutionId') THEN
        UPDATE public.courses SET institution_id = "institutionId" WHERE (institution_id IS NULL OR institution_id = '') AND "institutionId" IS NOT NULL AND "institutionId" <> '';
        UPDATE public.courses SET "institutionId" = institution_id WHERE ("institutionId" IS NULL OR "institutionId" = '') AND institution_id IS NOT NULL AND institution_id <> '';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'departmentId') THEN
        UPDATE public.courses SET department_id = "departmentId" WHERE (department_id IS NULL OR department_id = '') AND "departmentId" IS NOT NULL AND "departmentId" <> '';
        UPDATE public.courses SET "departmentId" = department_id WHERE ("departmentId" IS NULL OR "departmentId" = '') AND department_id IS NOT NULL AND department_id <> '';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'academicLevelId') THEN
        UPDATE public.courses SET academic_level_id = "academicLevelId" WHERE (academic_level_id IS NULL OR academic_level_id = '') AND "academicLevelId" IS NOT NULL AND "academicLevelId" <> '';
        UPDATE public.courses SET "academicLevelId" = academic_level_id WHERE ("academicLevelId" IS NULL OR "academicLevelId" = '') AND academic_level_id IS NOT NULL AND academic_level_id <> '';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_courses_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.institution_id IS NOT NULL AND (NEW."institutionId" IS NULL OR NEW."institutionId" = '') THEN
        NEW."institutionId" := NEW.institution_id;
    ELSIF NEW."institutionId" IS NOT NULL AND (NEW.institution_id IS NULL OR NEW.institution_id = '') THEN
        NEW.institution_id := NEW."institutionId";
    END IF;

    IF NEW.department_id IS NOT NULL AND (NEW."departmentId" IS NULL OR NEW."departmentId" = '') THEN
        NEW."departmentId" := NEW.department_id;
    ELSIF NEW."departmentId" IS NOT NULL AND (NEW.department_id IS NULL OR NEW.department_id = '') THEN
        NEW.department_id := NEW."departmentId";
    END IF;

    IF NEW.academic_level_id IS NOT NULL AND (NEW."academicLevelId" IS NULL OR NEW."academicLevelId" = '') THEN
        NEW."academicLevelId" := NEW.academic_level_id;
    ELSIF NEW."academicLevelId" IS NOT NULL AND (NEW.academic_level_id IS NULL OR NEW.academic_level_id = '') THEN
        NEW.academic_level_id := NEW."academicLevelId";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_courses ON public.courses;
CREATE TRIGGER trg_sync_courses
BEFORE INSERT OR UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.sync_courses_columns();

CREATE INDEX IF NOT EXISTS idx_courses_institution_id ON public.courses(institution_id);
CREATE INDEX IF NOT EXISTS idx_courses_institution_id_quoted ON public.courses("institutionId");
