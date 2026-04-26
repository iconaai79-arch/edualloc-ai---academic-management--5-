
-- Migration 186: Relax Alumnae Foreign Keys to support Unclaimed Schools
-- This migration drops strict foreign key constraints on institution_id
-- to allow alumnae registration for schools in the National Registry
-- that have not yet been fully onboarded as platform tenants.

DO $$ 
BEGIN
    -- 1. Relax alumnae_members
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alumnae_members_institution_id_fkey') THEN
        ALTER TABLE public.alumnae_members DROP CONSTRAINT alumnae_members_institution_id_fkey;
    END IF;
    ALTER TABLE public.alumnae_members ALTER COLUMN institution_id DROP NOT NULL;

    -- 2. Relax alumni_posts
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alumni_posts_institution_id_fkey') THEN
        ALTER TABLE public.alumni_posts DROP CONSTRAINT alumni_posts_institution_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alumni_posts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_posts' AND column_name = 'institution_id') THEN
            ALTER TABLE public.alumni_posts ADD COLUMN institution_id TEXT;
        END IF;
        ALTER TABLE public.alumni_posts ALTER COLUMN institution_id DROP NOT NULL;
    END IF;

    -- 3. Relax alumni_comments
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alumni_comments_institution_id_fkey') THEN
        ALTER TABLE public.alumni_comments DROP CONSTRAINT alumni_comments_institution_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alumni_comments') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_comments' AND column_name = 'institution_id') THEN
            ALTER TABLE public.alumni_comments ADD COLUMN institution_id TEXT;
        END IF;
        ALTER TABLE public.alumni_comments ALTER COLUMN institution_id DROP NOT NULL;
    END IF;

    -- 4. Relax alumni_messages
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alumni_messages_institution_id_fkey') THEN
        ALTER TABLE public.alumni_messages DROP CONSTRAINT alumni_messages_institution_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alumni_messages') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_messages' AND column_name = 'institution_id') THEN
            ALTER TABLE public.alumni_messages ADD COLUMN institution_id TEXT;
        END IF;
        ALTER TABLE public.alumni_messages ALTER COLUMN institution_id DROP NOT NULL;
    END IF;

END $$;

-- 5. Fix Permissions for Alumnae tables to ensure open access to social features
GRANT ALL ON public.alumni_posts TO anon, authenticated, service_role;
GRANT ALL ON public.alumni_comments TO anon, authenticated, service_role;
GRANT ALL ON public.alumni_messages TO anon, authenticated, service_role;
GRANT ALL ON public.alumnae_members TO anon, authenticated, service_role;
