-- Migration 300: Create revision_marketplace table
-- Enables AI generated assessment packs, CBC/8-4-4 past papers, marking schemes, and monetization.

CREATE TABLE IF NOT EXISTS public.revision_marketplace (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    curriculum TEXT DEFAULT 'CBC',
    topic TEXT,
    price NUMERIC DEFAULT 0,
    file_url TEXT,
    author_id TEXT,
    author_name TEXT DEFAULT 'EduAI AI Engine',
    downloads_count INTEGER DEFAULT 0,
    rating NUMERIC DEFAULT 5.0,
    is_ai_generated BOOLEAN DEFAULT true,
    content_json JSONB DEFAULT '{}'::jsonb,
    institution_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying by subject and grade level
CREATE INDEX IF NOT EXISTS idx_revision_marketplace_subject ON public.revision_marketplace(subject);
CREATE INDEX IF NOT EXISTS idx_revision_marketplace_grade ON public.revision_marketplace(grade_level);
CREATE INDEX IF NOT EXISTS idx_revision_marketplace_inst ON public.revision_marketplace(institution_id);

-- Enable RLS and grant access permissions
ALTER TABLE public.revision_marketplace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on revision_marketplace" 
    ON public.revision_marketplace FOR SELECT USING (true);

CREATE POLICY "Allow authenticated full access on revision_marketplace" 
    ON public.revision_marketplace FOR ALL USING (true);

GRANT ALL ON public.revision_marketplace TO anon, authenticated, service_role;
