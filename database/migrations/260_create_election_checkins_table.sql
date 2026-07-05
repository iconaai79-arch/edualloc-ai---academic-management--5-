-- Migration 260: Create election_checkins table to resolve voter check-in desk failures
CREATE TABLE IF NOT EXISTS election_checkins (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    election_id TEXT NOT NULL REFERENCES election_events(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(election_id, student_id)
);

-- Index for lookup performance
CREATE INDEX IF NOT EXISTS idx_election_checkins_lookup ON election_checkins(election_id, student_id);

-- Enable RLS
ALTER TABLE election_checkins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$
BEGIN
    DROP POLICY IF EXISTS election_checkins_super_admin ON election_checkins;
    DROP POLICY IF EXISTS election_checkins_institutional_manage ON election_checkins;
    DROP POLICY IF EXISTS election_checkins_institutional_select ON election_checkins;
END $$;

-- RLS Policies
CREATE POLICY election_checkins_super_admin ON election_checkins FOR ALL 
    USING (public.get_curr_user_role() = 'super_admin');

CREATE POLICY election_checkins_institutional_manage ON election_checkins FOR ALL TO authenticated
    USING (institution_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'teacher'))
    WITH CHECK (institution_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'teacher'));

CREATE POLICY election_checkins_institutional_select ON election_checkins FOR SELECT TO authenticated
    USING (institution_id = public.get_curr_user_inst_id());
