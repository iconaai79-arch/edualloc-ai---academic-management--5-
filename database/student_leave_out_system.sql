-- Student Leave Out / Exeat System
-- This migration sets up the multi-stage checkout process

CREATE TABLE IF NOT EXISTS leave_out_requests (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    class_teacher_id TEXT NOT NULL,
    boarding_master_id TEXT,
    security_id TEXT,
    reason TEXT NOT NULL,
    leave_date TIMESTAMP WITH TIME ZONE NOT NULL,
    return_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_boarding',
    sheet_url TEXT,
    house_checked_out_at TIMESTAMP WITH TIME ZONE,
    gate_checked_out_at TIMESTAMP WITH TIME ZONE,
    home_arrival_at TIMESTAMP WITH TIME ZONE,
    home_departure_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_leave_out_institution ON leave_out_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_leave_out_student ON leave_out_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_out_status ON leave_out_requests(status);

-- Enable RLS
ALTER TABLE leave_out_requests ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies (adjust as needed based on common patterns in the app)
CREATE POLICY "Enable all for anyone for now" ON leave_out_requests
    FOR ALL USING (true) WITH CHECK (true);
