-- Migration 403: Comprehensive column and schema synchronization for school_remedial_allocations
-- Description: Ensures all core, joint, substitution, priority, and automation columns natively exist on 
-- public.school_remedial_allocations with safe defaults, preventing PGRST204 un-cached column retries.

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_allocations') THEN
        -- 1. Stream & Classification
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS stream TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Confirmed';

        -- 2. Joint Classes / Multi-Stream Allocations
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS is_joint BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS joint_streams JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS joint_courses JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS joint_label TEXT;

        -- 3. Automation, Manual, Duty & Unallocated tracking
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS is_duty_lesson BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS is_unallocated BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS unallocated_reason TEXT;

        -- 4. Teacher Substitutions & Escalation
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS substitute_teacher_id TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS substitute_teacher_name TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS original_teacher_id TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS original_teacher_name TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS declined_teacher_ids JSONB DEFAULT '[]'::jsonb;

        -- 5. Metadata JSONB and GIN Indexing
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
              AND tablename = 'school_remedial_allocations' 
              AND indexname = 'idx_school_remedial_allocations_metadata_gin'
        ) THEN
            CREATE INDEX idx_school_remedial_allocations_metadata_gin ON public.school_remedial_allocations USING gin (metadata);
        END IF;
    END IF;

    -- Also ensure school_remedial_sessions has is_joint and joint_streams
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions') THEN
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS is_joint BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS joint_streams JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
