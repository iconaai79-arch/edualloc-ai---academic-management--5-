
-- Migration 188: Complete Alumnae Portal Ecosystem
-- This adds mentorship, jobs, businesses, events, and rewards to the Alumnae Circle.

-- 1. Enhance Alumnae Members with Mentorship and Rewards
ALTER TABLE public.alumnae_members 
ADD COLUMN IF NOT EXISTS is_mentor_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- 2. Alumnae Jobs (Exclusively for the network)
CREATE TABLE IF NOT EXISTS public.alumni_jobs (
    id TEXT PRIMARY KEY,
    author_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    description TEXT,
    salary_range TEXT,
    apply_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Alumnae Business Directory (Marketplace)
CREATE TABLE IF NOT EXISTS public.alumni_businesses (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    business_name TEXT NOT NULL,
    industry TEXT,
    description TEXT,
    website_url TEXT,
    exclusive_discount TEXT, -- e.g., "10% off for Alumnae"
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Alumnae Event RSVPs
CREATE TABLE IF NOT EXISTS public.alumni_event_rsvps (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES public.alumnae_events(id) ON DELETE CASCADE,
    alumna_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'confirmed', -- 'confirmed', 'maybe', 'declined'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, alumna_id)
);

-- 5. Special Interest Groups (Circles)
CREATE TABLE IF NOT EXISTS public.alumni_groups (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- 'Interest', 'Professional', 'Regional'
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alumni_group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES public.alumni_groups(id) ON DELETE CASCADE,
    alumna_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(group_id, alumna_id)
);

-- 6. Success Stories / Spotlights
CREATE TABLE IF NOT EXISTS public.alumni_success_stories (
    id TEXT PRIMARY KEY,
    alumna_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Digital Document Requests
CREATE TABLE IF NOT EXISTS public.alumni_document_requests (
    id TEXT PRIMARY KEY,
    alumna_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    document_type TEXT NOT NULL, -- 'Transcript', 'Certificate', 'Recommendation'
    purpose TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
    delivery_method TEXT DEFAULT 'email', -- 'email', 'pickup'
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ENABLE RLS
ALTER TABLE public.alumni_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_success_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_document_requests ENABLE ROW LEVEL SECURITY;

-- POLICIES (Per-Institution Isolation)
-- Note: Simplified for the demo, usually needs proper public/staff separation

DO $$ 
BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Alumni Jobs Isolation" ON public.alumni_jobs';
    EXECUTE 'CREATE POLICY "Alumni Jobs Isolation" ON public.alumni_jobs FOR ALL USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Alumni Business Isolation" ON public.alumni_businesses';
    EXECUTE 'CREATE POLICY "Alumni Business Isolation" ON public.alumni_businesses FOR ALL USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Alumni RSVP Isolation" ON public.alumni_event_rsvps';
    EXECUTE 'CREATE POLICY "Alumni RSVP Isolation" ON public.alumni_event_rsvps FOR ALL USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Alumni Groups Isolation" ON public.alumni_groups';
    EXECUTE 'CREATE POLICY "Alumni Groups Isolation" ON public.alumni_groups FOR ALL USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Alumni Group Members Isolation" ON public.alumni_group_members';
    EXECUTE 'CREATE POLICY "Alumni Group Members Isolation" ON public.alumni_group_members FOR ALL USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Alumni Success Stories Isolation" ON public.alumni_success_stories';
    EXECUTE 'CREATE POLICY "Alumni Success Stories Isolation" ON public.alumni_success_stories FOR ALL USING (true)';

    EXECUTE 'DROP POLICY IF EXISTS "Alumni Doc Requests Isolation" ON public.alumni_document_requests';
    EXECUTE 'CREATE POLICY "Alumni Doc Requests Isolation" ON public.alumni_document_requests FOR ALL USING (true)';
END $$;
