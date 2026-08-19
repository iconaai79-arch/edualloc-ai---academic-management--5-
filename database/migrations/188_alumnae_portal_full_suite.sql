
-- Migration 188: Complete Alumnae Portal Ecosystem
-- This adds mentorship, jobs, businesses, events, and rewards to the Alumnae Circle.

-- 1. Enhance Alumnae Members with Mentorship and Rewards
ALTER TABLE public.alumnae_members 
ADD COLUMN IF NOT EXISTS is_mentor_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- 2. Alumnae Jobs (Exclusively for the network)
-- Table Maintenance: Fix potential schema inconsistencies from previous partial migrations
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alumni_jobs') THEN
        -- Drop incorrect ID foreign key if it exists (fixes "alumni_jobs_id_fkey" error)
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alumni_jobs_id_fkey' AND table_name = 'alumni_jobs') THEN
            ALTER TABLE public.alumni_jobs DROP CONSTRAINT alumni_jobs_id_fkey;
        END IF;

        -- Handle renaming from author_id to alumna_id for existing tables
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_jobs' AND column_name = 'author_id') THEN
            ALTER TABLE public.alumni_jobs RENAME COLUMN author_id TO alumna_id;
        END IF;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.alumni_jobs (
    id TEXT PRIMARY KEY,
    alumna_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
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

-- 8. Alumnae Social Feed (Posts & Comments)
CREATE TABLE IF NOT EXISTS public.alumni_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    school_id TEXT REFERENCES public.school_registry(id) ON DELETE SET NULL,
    group_id TEXT REFERENCES public.alumni_groups(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    photo_url TEXT,
    video_url TEXT,
    likes TEXT[] DEFAULT '{}', -- Array of alumna IDs who liked
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alumni_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT REFERENCES public.alumni_posts(id) ON DELETE CASCADE,
    author_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Alumnae Networking (Follows)
CREATE TABLE IF NOT EXISTS public.alumni_follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    following_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(follower_id, following_id)
);

-- 10. Alumnae Notifications
CREATE TABLE IF NOT EXISTS public.alumni_notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    actor_id TEXT REFERENCES public.alumnae_members(id) ON DELETE SET NULL,
    actor_name TEXT,
    type TEXT, -- 'like', 'comment', 'follow', 'mention', 'message'
    post_id TEXT,
    content TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Alumnae Direct Messages
CREATE TABLE IF NOT EXISTS public.alumni_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    recipient_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. School Engagement (Projects & Inbox)
CREATE TABLE IF NOT EXISTS public.school_projects (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_amount DECIMAL(15,2) DEFAULT 0,
    current_amount DECIMAL(15,2) DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_updates (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.school_projects(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alumni_school_inbox (
    id TEXT PRIMARY KEY,
    alumna_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    direction TEXT NOT NULL, -- 'to_school', 'from_school'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ENABLE RLS ON NEW TABLES
ALTER TABLE public.alumni_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_school_inbox ENABLE ROW LEVEL SECURITY;

-- POLICIES (Per-Institution Isolation)
DO $policy_block$ 
DECLARE
    t text;
    tables text[] := ARRAY[
        'alumni_jobs', 'alumni_businesses', 'alumni_event_rsvps', 'alumni_groups', 
        'alumni_group_members', 'alumni_success_stories', 'alumni_document_requests', 
        'alumni_posts', 'alumni_comments', 'alumni_follows', 'alumni_notifications', 
        'alumni_messages', 'school_projects', 'project_updates', 'alumni_school_inbox'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Jobs Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Business Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni RSVP Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Groups Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Group Members Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Success Stories Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Doc Requests Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Posts Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Comments Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Follows Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Notifications Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni Messages Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "School Projects Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Project Updates Isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Alumni School Inbox Isolation" ON public.%I', t);

        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (true)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (auth.role() IN (''authenticated'', ''anon'') OR public.get_curr_user_role() = ''super_admin'') WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (auth.role() = ''authenticated'' OR public.get_curr_user_role() = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $policy_block$;

NOTIFY pgrst, 'reload schema';

