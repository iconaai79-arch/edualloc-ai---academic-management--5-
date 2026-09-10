-- Migration 385: Ensure subjects table contains target_classes, assigned_classes, classes, and related academic columns
-- Description: PostgREST throws PGRST204 "schema cache stale: stripping un-cached column" when frontend sends
-- assigned_classes or target_classes if these columns do not exist in public.subjects.
-- This migration ensures public.subjects natively contains these columns with safe defaults.

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subjects') THEN
        -- 1. Class allocation arrays
        ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS target_classes TEXT[] DEFAULT '{}';
        ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS assigned_classes TEXT[] DEFAULT '{}';
        ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS classes TEXT[] DEFAULT '{}';

        -- 2. CBC Curriculum and room/structure details
        ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS short_name TEXT;
        ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS target_course_level_id TEXT;
        ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS cbe_strands JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

        -- 3. Sync existing assigned_classes and target_classes if one is empty
        UPDATE public.subjects 
        SET target_classes = assigned_classes 
        WHERE (target_classes IS NULL OR array_length(target_classes, 1) IS NULL)
          AND assigned_classes IS NOT NULL AND array_length(assigned_classes, 1) > 0;

        UPDATE public.subjects 
        SET assigned_classes = target_classes 
        WHERE (assigned_classes IS NULL OR array_length(assigned_classes, 1) IS NULL)
          AND target_classes IS NOT NULL AND array_length(target_classes, 1) > 0;
    END IF;
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
