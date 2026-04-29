
-- Migration 193: Political Grassroots Portal (PGP) Core Ecosystem
-- This migration establishes the structural foundation for localized political mobilization.

-- 1. Political Geography Units
CREATE TABLE IF NOT EXISTS public.political_units (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES public.political_units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'County', 'Constituency', 'Ward', 'Village'
    code TEXT UNIQUE, -- e.g. Official IEBC code
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Campaign Supporter Profiles
CREATE TABLE IF NOT EXISTS public.campaign_supporters (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    -- Geography
    county_id TEXT REFERENCES public.political_units(id),
    constituency_id TEXT REFERENCES public.political_units(id),
    ward_id TEXT REFERENCES public.political_units(id),
    village_id TEXT REFERENCES public.political_units(id),
    -- Status
    is_volunteer BOOLEAN DEFAULT false,
    loyalty_points INTEGER DEFAULT 0,
    voter_registration_number TEXT,
    -- Proximity Networking (Ground Game)
    is_location_enabled BOOLEAN DEFAULT false,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_updated_at TIMESTAMPTZ,
    -- Visuals
    profile_photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Campaign Pulse (Social Feed)
CREATE TABLE IF NOT EXISTS public.campaign_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL, -- Reference to campaign_supporters(id) or staff_id
    unit_id TEXT REFERENCES public.political_units(id), -- Scoped to a specific ward/constituency
    content TEXT NOT NULL,
    photo_url TEXT,
    video_url TEXT,
    likes TEXT[] DEFAULT '{}',
    comments_count INTEGER DEFAULT 0,
    is_official BOOLEAN DEFAULT false, -- If posted by the candidate/official channel
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Town Hall Feedback (Inbox)
CREATE TABLE IF NOT EXISTS public.campaign_feedback (
    id TEXT PRIMARY KEY,
    supporter_id TEXT REFERENCES public.campaign_supporters(id) ON DELETE CASCADE,
    unit_id TEXT REFERENCES public.political_units(id),
    category TEXT, -- 'Infrastructure', 'Health', 'Education', 'Manifesto Query'
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'actioned'
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Volunteer Tasks (Mobilization)
CREATE TABLE IF NOT EXISTS public.campaign_tasks (
    id TEXT PRIMARY KEY,
    unit_id TEXT REFERENCES public.political_units(id),
    title TEXT NOT NULL,
    description TEXT,
    points_reward INTEGER DEFAULT 10,
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Task Participations
CREATE TABLE IF NOT EXISTS public.campaign_task_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES public.campaign_tasks(id) ON DELETE CASCADE,
    supporter_id TEXT REFERENCES public.campaign_supporters(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'completed',
    proof_url TEXT, -- e.g. photo of canvassing
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(task_id, supporter_id)
);

-- ENABLE RLS
ALTER TABLE public.political_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_supporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_task_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES (Open read for public/supporters, write for authenticated)
DO $$ 
BEGIN
    EXECUTE 'CREATE POLICY "Public Read Political Units" ON public.political_units FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Supporters Read Posts" ON public.campaign_posts FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Supporters Write Feedback" ON public.campaign_feedback FOR INSERT WITH CHECK (true)';
END $$;
