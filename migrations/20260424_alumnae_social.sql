-- Alumnae Social Tables
CREATE TABLE IF NOT EXISTS alumni_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_photo TEXT,
    institution_id TEXT NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT[], 
    likes TEXT[] DEFAULT '{}',
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

-- Update alumnae_members with missing infrastructure columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumnae_members' AND column_name = 'admission_number') THEN
        ALTER TABLE alumnae_members ADD COLUMN admission_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumnae_members' AND column_name = 'payment_id') THEN
        ALTER TABLE alumnae_members ADD COLUMN payment_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumnae_members' AND column_name = 'registration_fee') THEN
        ALTER TABLE alumnae_members ADD COLUMN registration_fee DECIMAL(15,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumnae_members' AND column_name = 'joined_at') THEN
        ALTER TABLE alumnae_members ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;
