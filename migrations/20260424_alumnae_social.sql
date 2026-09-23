-- Alumnae Social Module Base Infrastructure
-- Optimized for EduAI Next-Gen Core

-- 1. Main Social Infrastructure
CREATE TABLE IF NOT EXISTS alumni_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_photo TEXT,
    institution_id TEXT NOT NULL,
    school_id TEXT,
    content TEXT NOT NULL,
    photo_url TEXT,
    video_url TEXT,
    likes TEXT[] DEFAULT '{}',
    comments_count INTEGER DEFAULT 0,
    is_announcement BOOLEAN DEFAULT false,
    event_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alumni_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES alumni_posts(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_photo TEXT,
    institution_id TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alumni_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alumni_follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS alumni_school_inbox (
    id TEXT PRIMARY KEY,
    alumna_id TEXT NOT NULL,
    institution_id TEXT NOT NULL,
    content TEXT NOT NULL,
    direction TEXT DEFAULT 'to_school', -- 'to_school' or 'from_school'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS school_projects (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    target_amount DECIMAL(15,2) DEFAULT 0,
    current_amount DECIMAL(15,2) DEFAULT 0,
    status TEXT DEFAULT 'active', -- 'active', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_updates (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES school_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alumni_notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_photo TEXT,
    type TEXT NOT NULL, -- 'join', 'like', 'comment', 'message'
    related_id TEXT, -- post_id or message_id
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Schema Repair and Evolution Block
DO $$ 
BEGIN 
    -- Posts Column Repairs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_posts' AND column_name = 'school_id') THEN
        ALTER TABLE alumni_posts ADD COLUMN school_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_posts' AND column_name = 'is_announcement') THEN
        ALTER TABLE alumni_posts ADD COLUMN is_announcement BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_posts' AND column_name = 'event_date') THEN
        ALTER TABLE alumni_posts ADD COLUMN event_date TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_posts' AND column_name = 'photo_url') THEN
        ALTER TABLE alumni_posts ADD COLUMN photo_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_posts' AND column_name = 'author_photo') THEN
        ALTER TABLE alumni_posts ADD COLUMN author_photo TEXT;
    END IF;

    -- Members Infrastructure Repairs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alumnae_members') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumnae_members' AND column_name = 'profile_photo_url') THEN
            ALTER TABLE alumnae_members ADD COLUMN profile_photo_url TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumnae_members' AND column_name = 'cover_photo_url') THEN
            ALTER TABLE alumnae_members ADD COLUMN cover_photo_url TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumnae_members' AND column_name = 'admission_number') THEN
            ALTER TABLE alumnae_members ADD COLUMN admission_number TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumnae_members' AND column_name = 'registration_fee') THEN
            ALTER TABLE alumnae_members ADD COLUMN registration_fee DECIMAL(15,2);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumnae_members' AND column_name = 'is_featured') THEN
            ALTER TABLE alumnae_members ADD COLUMN is_featured BOOLEAN DEFAULT false;
        END IF;
    END IF;

    -- Comments Repairs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alumni_comments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_comments' AND column_name = 'author_photo') THEN
            ALTER TABLE alumni_comments ADD COLUMN author_photo TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_comments' AND column_name = 'institution_id') THEN
            ALTER TABLE alumni_comments ADD COLUMN institution_id TEXT;
        END IF;
    END IF;

    -- Add missing institutions_id to messages/comments if needed (Safe generic check)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_messages' AND column_name = 'id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_messages' AND column_name = 'institution_id') THEN
            ALTER TABLE alumni_messages ADD COLUMN institution_id TEXT;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_posts' AND column_name = 'video_url') THEN
        ALTER TABLE alumni_posts ADD COLUMN video_url TEXT;
    END IF;
END $$;

-- 3. Enable RLS on all alumni tables
ALTER TABLE public.alumni_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_school_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_notifications ENABLE ROW LEVEL SECURITY;

-- Permissive policies (allow authenticated users full access; anon read-only on social content)
DROP POLICY IF EXISTS "alumni_posts_policy" ON public.alumni_posts;
CREATE POLICY "alumni_posts_policy" ON public.alumni_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "alumni_comments_policy" ON public.alumni_comments;
CREATE POLICY "alumni_comments_policy" ON public.alumni_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "alumni_messages_policy" ON public.alumni_messages;
CREATE POLICY "alumni_messages_policy" ON public.alumni_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "alumni_follows_policy" ON public.alumni_follows;
CREATE POLICY "alumni_follows_policy" ON public.alumni_follows FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "alumni_school_inbox_policy" ON public.alumni_school_inbox;
CREATE POLICY "alumni_school_inbox_policy" ON public.alumni_school_inbox FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "school_projects_policy" ON public.school_projects;
CREATE POLICY "school_projects_policy" ON public.school_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "school_projects_anon_read" ON public.school_projects FOR SELECT TO anon USING (status = 'active');

DROP POLICY IF EXISTS "project_updates_policy" ON public.project_updates;
CREATE POLICY "project_updates_policy" ON public.project_updates FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "alumni_notifications_policy" ON public.alumni_notifications;
CREATE POLICY "alumni_notifications_policy" ON public.alumni_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Data API grants (required from Supabase Oct 30 2025: new tables need explicit grants)
GRANT SELECT ON public.alumni_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_posts TO authenticated;
GRANT ALL ON public.alumni_posts TO service_role;

GRANT SELECT ON public.alumni_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_comments TO authenticated;
GRANT ALL ON public.alumni_comments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_messages TO authenticated;
GRANT ALL ON public.alumni_messages TO service_role;

GRANT SELECT, INSERT, DELETE ON public.alumni_follows TO authenticated;
GRANT ALL ON public.alumni_follows TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_school_inbox TO authenticated;
GRANT ALL ON public.alumni_school_inbox TO service_role;

GRANT SELECT ON public.school_projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_projects TO authenticated;
GRANT ALL ON public.school_projects TO service_role;

GRANT SELECT ON public.project_updates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_updates TO authenticated;
GRANT ALL ON public.project_updates TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_notifications TO authenticated;
GRANT ALL ON public.alumni_notifications TO service_role;

-- 4. Cache Management
NOTIFY pgrst, 'reload schema';
