CREATE TABLE IF NOT EXISTS observation_notes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    timetable_entry_id TEXT,
    practice_teacher_id TEXT,
    lecturer_id TEXT,
    notes TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    institution_id TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE observation_notes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON observation_notes
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

