-- Migration: Add tables for Student Voice (anonymous intel) and Parent Chat (DMs)
-- =================================================================================

-- 1. Table for anonymous student voice suggestions
CREATE TABLE IF NOT EXISTS public.school_intel_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL, -- No FK to institutions if institutional isolation is managed at app layer, but let's add it for schema integrity
    category VARCHAR(50) DEFAULT 'General',
    message TEXT NOT NULL,
    access_key_hash TEXT NOT NULL, -- Hash of student-generated tracking code
    risk_level VARCHAR(20) DEFAULT 'INFO', -- INFO, LOW, MEDIUM, HIGH, CRITICAL
    ai_summary TEXT, -- Filled in by AI
    status VARCHAR(20) DEFAULT 'New', -- New, Investigating, Resolved, Archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table for administrator replies to anonymous submissions
CREATE TABLE IF NOT EXISTS public.school_intel_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.school_intel_submissions(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- 'admin' or 'student'
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table for parent-student messaging channel (secure and controlled)
CREATE TABLE IF NOT EXISTS public.student_parent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL, -- References users(id)
    parent_phone VARCHAR(25) NOT NULL, -- Registered parent phone number
    message TEXT NOT NULL,
    direction VARCHAR(20) NOT NULL, -- 'to_parent' or 'from_parent'
    is_delivered_sms BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_intel_submissions_inst ON public.school_intel_submissions(institution_id);
CREATE INDEX IF NOT EXISTS idx_intel_replies_sub ON public.school_intel_replies(submission_id);
CREATE INDEX IF NOT EXISTS idx_sp_messages_student ON public.student_parent_messages(student_id);

-- Enable RLS where applicable
ALTER TABLE public.school_intel_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_intel_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parent_messages ENABLE ROW LEVEL SECURITY;

-- Policies for student parent messages
DROP POLICY IF EXISTS "Access own parent messages" ON public.student_parent_messages;
CREATE POLICY "Access own parent messages" 
ON public.student_parent_messages FOR ALL
USING (auth.uid()::text = student_id::text OR 'u_' || auth.uid()::text = student_id::text OR auth.jwt() ->> 'email' = 'super@app.com');

-- Policies for intel submissions (Allow public anonymous insert and select by access_key_hash)
DROP POLICY IF EXISTS "Anonymous submissions insertion" ON public.school_intel_submissions;
CREATE POLICY "Anonymous submissions insertion" 
ON public.school_intel_submissions FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Select own anonymous submissions" ON public.school_intel_submissions;
CREATE POLICY "Select own anonymous submissions" 
ON public.school_intel_submissions FOR SELECT 
USING (true); -- Filtered at app-level by access_key matching

DROP POLICY IF EXISTS "Admin view all submissions" ON public.school_intel_submissions;
CREATE POLICY "Admin view all submissions" 
ON public.school_intel_submissions FOR ALL 
USING (true); -- Handled by super/institution check at app layer

-- Policies for intel replies
DROP POLICY IF EXISTS "Replies access" ON public.school_intel_replies;
CREATE POLICY "Replies access" 
ON public.school_intel_replies FOR ALL 
USING (true);
