-- Migration: Add Conversation Transcript and Source to Demo Requests Table
-- Description: Enables storing full AI conversation transcripts, source information, and follow-up notes for Super Admin tracking.

ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS conversation_transcript JSONB DEFAULT '[]'::jsonb;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'AI Showcase Advisor';
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ensure RLS policies allow public and staff inserts and updates
DROP POLICY IF EXISTS "Public can insert demo requests" ON demo_requests;
CREATE POLICY "Public can insert demo requests" ON demo_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can view demo requests" ON demo_requests;
CREATE POLICY "Staff can view demo requests" ON demo_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update demo requests" ON demo_requests;
CREATE POLICY "Allow update demo requests" ON demo_requests FOR UPDATE USING (true) WITH CHECK (true);
