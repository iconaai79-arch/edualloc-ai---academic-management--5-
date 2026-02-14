CREATE TABLE IF NOT EXISTS observation_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_entry_id UUID NOT NULL,
    practice_teacher_id UUID NOT NULL,
    notes TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    institution_id UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE observation_notes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all actions for authenticated users (for now, to match other loose policies)
CREATE POLICY "Enable all access for authenticated users" ON observation_notes
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
