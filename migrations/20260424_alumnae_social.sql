
-- Alumnae Social Tables
CREATE TABLE IF NOT EXISTS alumni_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_photo TEXT,
    institution_id TEXT NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT[], -- array of strings for media
    likes TEXT[] DEFAULT '{}', -- array of user IDs who liked
    comments_count INTEGER DEFAULT 0,
    hashtags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alumni_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES alumni_posts(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_photo TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS (conceptual, as we use service role in proxy)
-- But for documentation/future:
-- ALTER TABLE alumni_posts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE alumni_comments ENABLE ROW LEVEL SECURITY;
