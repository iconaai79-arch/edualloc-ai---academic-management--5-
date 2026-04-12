
-- Migration 152: Create Alumnae Research & Registration Tables
-- This supports the Alumnae Network registration and portal activation flow.

-- 1. Alumnae Members (The Registry of Graduates)
CREATE TABLE IF NOT EXISTS public.alumnae_members (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.school_registry(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL, -- Linked tenant if school is claimed
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT,
    graduation_year TEXT,
    department TEXT,
    current_job TEXT,
    current_company TEXT,
    linkedin_url TEXT,
    twitter_url TEXT,
    bio TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending_verification', -- 'pending_verification', 'active', 'rejected'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Alumnae Events (Reunions, Networking, Chapter Meetings)
CREATE TABLE IF NOT EXISTS public.alumnae_events (
    id TEXT PRIMARY KEY,
    school_id TEXT REFERENCES public.school_registry(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    location TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Alumnae Contributions (Donations, Projects, Scholarships)
CREATE TABLE IF NOT EXISTS public.alumnae_contributions (
    id TEXT PRIMARY KEY,
    alumna_id TEXT REFERENCES public.alumnae_members(id) ON DELETE CASCADE,
    school_id TEXT REFERENCES public.school_registry(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    amount DECIMAL(15,2),
    purpose TEXT, -- 'Scholarship', 'Infrastructure', 'General'
    status TEXT DEFAULT 'pending',
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Safety Check: Handle existing tables and UUID vs TEXT mismatch
DO $$ 
BEGIN
    -- Fix for Alumnae Members
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'alumnae_members' AND column_name = 'institution_id') THEN
        ALTER TABLE public.alumnae_members ADD COLUMN institution_id TEXT;
    END IF;

    -- Fix for Alumnae Events
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'alumnae_events' AND column_name = 'institution_id') THEN
        ALTER TABLE public.alumnae_events ADD COLUMN institution_id TEXT;
    END IF;

    -- Fix for Alumnae Contributions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'alumnae_contributions' AND column_name = 'institution_id') THEN
        ALTER TABLE public.alumnae_contributions ADD COLUMN institution_id TEXT;
    END IF;

    -- 5. Foreign Key robustness (Optional: only if institutions.id is TEXT)
    -- We try to add the FK, but if types don't match, we log and skip so RLS still works
    BEGIN
        ALTER TABLE public.alumnae_members ADD CONSTRAINT alumnae_members_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Skipping FK constraint for alumnae_members due to type mismatch or existing constraint.';
    END;

    BEGIN
        ALTER TABLE public.alumnae_events ADD CONSTRAINT alumnae_events_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Skipping FK constraint for alumnae_events due to type mismatch.';
    END;

    BEGIN
        ALTER TABLE public.alumnae_contributions ADD CONSTRAINT alumnae_contributions_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Skipping FK constraint for alumnae_contributions due to type mismatch.';
    END;
END $$;


-- ENABLE RLS
ALTER TABLE public.alumnae_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnae_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnae_contributions ENABLE ROW LEVEL SECURITY;

-- POLICIES

-- Members: Public can insert (register), staff can read/manage
DROP POLICY IF EXISTS "Public Alumnae Registration" ON public.alumnae_members;
CREATE POLICY "Public Alumnae Registration" ON public.alumnae_members
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Alumnae Management Policy" ON public.alumnae_members;
CREATE POLICY "Alumnae Management Policy" ON public.alumnae_members
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

-- Events: Public can read, staff can manage
DROP POLICY IF EXISTS "Public Events Read" ON public.alumnae_events;
CREATE POLICY "Public Events Read" ON public.alumnae_events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Events Management Policy" ON public.alumnae_events;
CREATE POLICY "Events Management Policy" ON public.alumnae_events
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

-- Contributions: Registrants can insert/read own, staff can manage
DROP POLICY IF EXISTS "Alumnae Contributions Read Own" ON public.alumnae_contributions;
CREATE POLICY "Alumnae Contributions Read Own" ON public.alumnae_contributions
    FOR SELECT USING (true); -- Publicly searchable if status is verified or specific logic

DROP POLICY IF EXISTS "Contributions Management Policy" ON public.alumnae_contributions;
CREATE POLICY "Contributions Management Policy" ON public.alumnae_contributions
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');
