-- ============================================================================
-- Migration 520: Create observation_notes table and grant access
-- Resolves TalkSasa PostgreSQL error:
-- ERROR: relation "observation_notes" does not exist at character 15
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.observation_notes (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    "institutionId" TEXT,
    timetable_entry_id TEXT,
    "timetableEntryId" TEXT,
    practice_teacher_id TEXT,
    "practiceTeacherId" TEXT,
    lecturer_id TEXT,
    "lecturerId" TEXT,
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure snake_case and camelCase column aliases exist
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS timetable_entry_id TEXT;
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS "timetableEntryId" TEXT;
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS practice_teacher_id TEXT;
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS "practiceTeacherId" TEXT;
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS lecturer_id TEXT;
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS "lecturerId" TEXT;
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_observation_notes_inst_id ON public.observation_notes(institution_id);
CREATE INDEX IF NOT EXISTS idx_observation_notes_teacher ON public.observation_notes(practice_teacher_id);
CREATE INDEX IF NOT EXISTS idx_observation_notes_lecturer ON public.observation_notes(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_observation_notes_timetable ON public.observation_notes(timetable_entry_id);

-- Row Level Security and permissions
ALTER TABLE public.observation_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "observation_notes_all_access" ON public.observation_notes;
CREATE POLICY "observation_notes_all_access" ON public.observation_notes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.observation_notes TO anon, authenticated, service_role;

COMMIT;
