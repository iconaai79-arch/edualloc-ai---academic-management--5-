-- 309. CREATE GUEST FEEDBACK & FEEDBACK SUBMISSIONS TABLES
-- Enables public guest reviews and internal feedback with permissive insert for public portal submissions

CREATE TABLE IF NOT EXISTS public.feedback_submissions (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    guest_name TEXT,
    title TEXT NOT NULL DEFAULT 'General Feedback',
    content TEXT NOT NULL DEFAULT '',
    comments TEXT,
    rating INTEGER,
    visit_date DATE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'new',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all columns exist if table was already created earlier
ALTER TABLE public.feedback_submissions ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE public.feedback_submissions ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE public.feedback_submissions ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE public.feedback_submissions ADD COLUMN IF NOT EXISTS visit_date DATE;
ALTER TABLE public.feedback_submissions ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE public.feedback_submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE public.feedback_submissions ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.feedback_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.feedback_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.feedback_submissions ALTER COLUMN student_id DROP NOT NULL;

-- Direct guest_feedback table
CREATE TABLE IF NOT EXISTS public.guest_feedback (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    guest_name TEXT,
    title TEXT NOT NULL DEFAULT 'General Feedback',
    content TEXT,
    comments TEXT,
    rating INTEGER,
    visit_date DATE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'new',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS Policies
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert feedback" ON public.feedback_submissions;
CREATE POLICY "Public insert feedback" ON public.feedback_submissions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select feedback" ON public.feedback_submissions;
CREATE POLICY "Allow select feedback" ON public.feedback_submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update feedback" ON public.feedback_submissions;
CREATE POLICY "Allow update feedback" ON public.feedback_submissions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public insert guest_feedback" ON public.guest_feedback;
CREATE POLICY "Public insert guest_feedback" ON public.guest_feedback FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select guest_feedback" ON public.guest_feedback;
CREATE POLICY "Allow select guest_feedback" ON public.guest_feedback FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update guest_feedback" ON public.guest_feedback;
CREATE POLICY "Allow update guest_feedback" ON public.guest_feedback FOR UPDATE USING (true);
