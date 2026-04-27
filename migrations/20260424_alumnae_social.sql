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

-- 3. Cache Management
NOTIFY pgrst, 'reload schema';
