
-- Add rich content fields to institutions
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS motto TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS vision TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS mission TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS history TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS showcase_cpanel_url TEXT;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS showcase_cpanel_token TEXT;

-- Create school gallery table
CREATE TABLE IF NOT EXISTS school_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    event_date DATE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create school advertisements table
CREATE TABLE IF NOT EXISTS school_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    link_url TEXT,
    title TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_location TEXT DEFAULT 'sidebar', -- e.g., 'hero', 'sidebar', 'footer'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE school_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_ads ENABLE ROW LEVEL SECURITY;

-- Gallery Policies
DROP POLICY IF EXISTS "Public select: school_gallery" ON school_gallery;
CREATE POLICY "Public select: school_gallery" ON school_gallery FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage: school_gallery" ON school_gallery;
CREATE POLICY "Admin manage: school_gallery" ON school_gallery 
FOR ALL USING (
    public.get_curr_user_inst_id() = institution_id AND 
    public.get_curr_user_role() IN ('admin', 'head_teacher', 'super_admin')
);

-- Ads Policies
DROP POLICY IF EXISTS "Public select: school_ads" ON school_ads;
CREATE POLICY "Public select: school_ads" ON school_ads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage: school_ads" ON school_ads;
CREATE POLICY "Admin manage: school_ads" ON school_ads 
FOR ALL USING (
    public.get_curr_user_inst_id() = institution_id AND 
    public.get_curr_user_role() IN ('admin', 'head_teacher', 'super_admin')
);
