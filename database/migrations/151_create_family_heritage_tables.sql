
-- Migration 151: Create Family Heritage Module Tables (v2 - TEXT ID compatibility)
-- This includes Heritage Tree, Stories, Gallery, and Announcements for Family Preservation institutions.

-- 1. Heritage Members (Family Tree Nodes)
CREATE TABLE IF NOT EXISTS public.heritage_members (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    name TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT 'Paternal', -- 'Paternal' or 'Maternal'
    relation TEXT NOT NULL,
    birth_year TEXT,
    death_year TEXT,
    notes TEXT,
    profile_photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Heritage Stories (Oral History & Origins)
CREATE TABLE IF NOT EXISTS public.heritage_stories (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    title TEXT NOT NULL,
    story_date TEXT,
    story_text TEXT NOT NULL,
    author_name TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Heritage Gallery (Family Heirlooms & Milestones)
CREATE TABLE IF NOT EXISTS public.heritage_gallery (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT,
    captured_at TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Heritage Announcements (Family Council Proclamations)
CREATE TABLE IF NOT EXISTS public.heritage_announcements (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'CEREMONY', 'ADMIN', 'MEETING', 'MEMORIAL'
    announcement_date TEXT,
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Set up Foreign Keys with Type Handling
DO $$
BEGIN
    -- Heritage Members FK
    BEGIN
        ALTER TABLE public.heritage_members ADD CONSTRAINT heritage_members_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping heritage_members FK due to type mismatch or existing constraint.';
    END;

    -- Heritage Stories FK
    BEGIN
        ALTER TABLE public.heritage_stories ADD CONSTRAINT heritage_stories_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping heritage_stories FK due to type mismatch.';
    END;

    -- Heritage Gallery FK
    BEGIN
        ALTER TABLE public.heritage_gallery ADD CONSTRAINT heritage_gallery_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping heritage_gallery FK due to type mismatch.';
    END;

    -- Heritage Announcements FK
    BEGIN
        ALTER TABLE public.heritage_announcements ADD CONSTRAINT heritage_announcements_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping heritage_announcements FK due to type mismatch.';
    END;
END $$;


-- ENABLE RLS
ALTER TABLE public.heritage_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heritage_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heritage_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heritage_announcements ENABLE ROW LEVEL SECURITY;

-- POLICIES (Institution Level Access)
-- Pattern: Users can only see/edit records from their own institution.

-- Heritage Members Policies
DROP POLICY IF EXISTS "Heritage Members Read Policy" ON public.heritage_members;
CREATE POLICY "Heritage Members Read Policy" ON public.heritage_members
    FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Heritage Members Insert Policy" ON public.heritage_members;
CREATE POLICY "Heritage Members Insert Policy" ON public.heritage_members
    FOR INSERT WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Heritage Members Update Policy" ON public.heritage_members;
CREATE POLICY "Heritage Members Update Policy" ON public.heritage_members
    FOR UPDATE USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Heritage Members Delete Policy" ON public.heritage_members;
CREATE POLICY "Heritage Members Delete Policy" ON public.heritage_members
    FOR DELETE USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

-- Similar policies for other tables
-- Heritage Stories
DROP POLICY IF EXISTS "Heritage Stories Read Policy" ON public.heritage_stories;
CREATE POLICY "Heritage Stories Read Policy" ON public.heritage_stories
    FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');
DROP POLICY IF EXISTS "Heritage Stories Manage Policy" ON public.heritage_stories;
CREATE POLICY "Heritage Stories Manage Policy" ON public.heritage_stories
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

-- Heritage Gallery
DROP POLICY IF EXISTS "Heritage Gallery Read Policy" ON public.heritage_gallery;
CREATE POLICY "Heritage Gallery Read Policy" ON public.heritage_gallery
    FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');
DROP POLICY IF EXISTS "Heritage Gallery Manage Policy" ON public.heritage_gallery;
CREATE POLICY "Heritage Gallery Manage Policy" ON public.heritage_gallery
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

-- Heritage Announcements
DROP POLICY IF EXISTS "Heritage Announcements Read Policy" ON public.heritage_announcements;
CREATE POLICY "Heritage Announcements Read Policy" ON public.heritage_announcements
    FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');
DROP POLICY IF EXISTS "Heritage Announcements Manage Policy" ON public.heritage_announcements;
CREATE POLICY "Heritage Announcements Manage Policy" ON public.heritage_announcements
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');
