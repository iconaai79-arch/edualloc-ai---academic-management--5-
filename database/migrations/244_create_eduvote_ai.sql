-- Migration 244: Create EduVote AI Tables for Student Council & House Captain Elections
-- Secure, double-blind voting system with RLS policies

-- 1. ELECTION EVENTS TABLE (Overall metadata)
CREATE TABLE IF NOT EXISTS election_events (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    title TEXT NOT NULL,
    academic_year_id TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'active', 'paused', 'closed')),
    voting_system TEXT DEFAULT 'fptp' CHECK (voting_system IN ('fptp', 'ranked_choice')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ELECTION CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS election_candidates (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    election_id TEXT NOT NULL REFERENCES election_events(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position TEXT NOT NULL,
    tagline TEXT,
    manifesto TEXT,
    poster_url TEXT,
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(election_id, student_id, position)
);

-- 3. VOTER CHECK-IN LEDGER (Prevents double voting)
CREATE TABLE IF NOT EXISTS election_voters_ledger (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    election_id TEXT NOT NULL REFERENCES election_events(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_fingerprint TEXT,
    UNIQUE(election_id, student_id)
);

-- 4. ANONYMOUS BALLOTS TABLE (Secrecy guaranteed, no student_id reference)
CREATE TABLE IF NOT EXISTS election_ballots (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    election_id TEXT NOT NULL REFERENCES election_events(id) ON DELETE CASCADE,
    position TEXT NOT NULL,
    candidate_id TEXT REFERENCES election_candidates(id) ON DELETE CASCADE,
    preference_rank INTEGER DEFAULT 1,
    receipt_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_election_events_inst ON election_events(institution_id);
CREATE INDEX IF NOT EXISTS idx_election_candidates_election ON election_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_election_voters_ledger_lookup ON election_voters_ledger(election_id, student_id);
CREATE INDEX IF NOT EXISTS idx_election_ballots_lookup ON election_ballots(election_id, candidate_id);

-- Enable Row Level Security (RLS)
ALTER TABLE election_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_voters_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_ballots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    -- election_events
    DROP POLICY IF EXISTS election_events_super_admin ON election_events;
    DROP POLICY IF EXISTS election_events_institutional_manage ON election_events;
    DROP POLICY IF EXISTS election_events_institutional_select ON election_events;

    -- election_candidates
    DROP POLICY IF EXISTS election_candidates_super_admin ON election_candidates;
    DROP POLICY IF EXISTS election_candidates_institutional_manage ON election_candidates;
    DROP POLICY IF EXISTS election_candidates_institutional_select ON election_candidates;

    -- election_voters_ledger
    DROP POLICY IF EXISTS election_voters_ledger_super_admin ON election_voters_ledger;
    DROP POLICY IF EXISTS election_voters_ledger_institutional_manage ON election_voters_ledger;
    DROP POLICY IF EXISTS election_voters_ledger_student_select ON election_voters_ledger;
    DROP POLICY IF EXISTS election_voters_ledger_student_insert ON election_voters_ledger;

    -- election_ballots
    DROP POLICY IF EXISTS election_ballots_super_admin ON election_ballots;
    DROP POLICY IF EXISTS election_ballots_institutional_manage ON election_ballots;
    DROP POLICY IF EXISTS election_ballots_student_select ON election_ballots;
    DROP POLICY IF EXISTS election_ballots_student_insert ON election_ballots;
END $$;

-- RLS Policies for election_events
CREATE POLICY election_events_super_admin ON election_events FOR ALL 
    USING (public.get_curr_user_role() = 'super_admin');

CREATE POLICY election_events_institutional_manage ON election_events FOR ALL TO authenticated
    USING (institution_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'teacher'))
    WITH CHECK (institution_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'teacher'));

CREATE POLICY election_events_institutional_select ON election_events FOR SELECT TO authenticated
    USING (institution_id = public.get_curr_user_inst_id());

-- RLS Policies for election_candidates
CREATE POLICY election_candidates_super_admin ON election_candidates FOR ALL 
    USING (public.get_curr_user_role() = 'super_admin');

CREATE POLICY election_candidates_institutional_manage ON election_candidates FOR ALL TO authenticated
    USING (institution_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'teacher'))
    WITH CHECK (institution_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'teacher'));

CREATE POLICY election_candidates_institutional_select ON election_candidates FOR SELECT TO authenticated
    USING (institution_id = public.get_curr_user_inst_id());

-- RLS Policies for election_voters_ledger
CREATE POLICY election_voters_ledger_super_admin ON election_voters_ledger FOR ALL 
    USING (public.get_curr_user_role() = 'super_admin');

CREATE POLICY election_voters_ledger_institutional_manage ON election_voters_ledger FOR ALL TO authenticated
    USING (institution_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'teacher'))
    WITH CHECK (institution_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'teacher'));

CREATE POLICY election_voters_ledger_student_select ON election_voters_ledger FOR SELECT TO authenticated
    USING (institution_id = public.get_curr_user_inst_id() AND student_id = auth.uid()::text);

CREATE POLICY election_voters_ledger_student_insert ON election_voters_ledger FOR INSERT TO authenticated
    WITH CHECK (institution_id = public.get_curr_user_inst_id() AND student_id = auth.uid()::text);

-- RLS Policies for election_ballots
CREATE POLICY election_ballots_super_admin ON election_ballots FOR ALL 
    USING (public.get_curr_user_role() = 'super_admin');

CREATE POLICY election_ballots_institutional_manage ON election_ballots FOR ALL TO authenticated
    USING (institution_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'teacher'))
    WITH CHECK (institution_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'teacher'));

CREATE POLICY election_ballots_student_select ON election_ballots FOR SELECT TO authenticated
    USING (
        institution_id = public.get_curr_user_inst_id() 
        AND (
            EXISTS (SELECT 1 FROM election_events WHERE id = election_ballots.election_id AND status = 'closed')
            OR receipt_hash = receipt_hash
        )
    );

CREATE POLICY election_ballots_student_insert ON election_ballots FOR INSERT TO authenticated
    WITH CHECK (
        institution_id = public.get_curr_user_inst_id() 
        AND EXISTS (SELECT 1 FROM election_events WHERE id = election_ballots.election_id AND status = 'active')
    );

-- Comments
COMMENT ON TABLE election_events IS 'Contains details of elections created within the school';
COMMENT ON TABLE election_candidates IS 'Contains students participating as candidates in elections';
COMMENT ON TABLE election_voters_ledger IS 'Tracks which students voted in which elections to prevent double-voting';
COMMENT ON TABLE election_ballots IS 'Stores double-blind votes mapped to candidates without student IDs for absolute privacy';
