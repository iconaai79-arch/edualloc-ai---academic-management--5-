-- Migration: 396_add_joint_classes_to_remedial_allocations.sql
-- Purpose: Support joint classes / multi-stream remedial lesson allocations (e.g. one teacher teaching CRE for several streams simultaneously)

ALTER TABLE IF EXISTS public.school_remedial_allocations
    ADD COLUMN IF NOT EXISTS is_joint BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS joint_streams JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS joint_courses JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.school_remedial_allocations.is_joint IS 'True if allocation combines multiple streams or classes in a joint session';
COMMENT ON COLUMN public.school_remedial_allocations.joint_streams IS 'Array of stream names included in this joint session (e.g. ["East", "West"])';
COMMENT ON COLUMN public.school_remedial_allocations.joint_courses IS 'Array of course IDs included in this joint session (for cross-class joint lessons)';

ALTER TABLE IF EXISTS public.school_remedial_sessions
    ADD COLUMN IF NOT EXISTS is_joint BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS joint_streams JSONB DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
