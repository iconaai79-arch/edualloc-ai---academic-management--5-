
-- Migration 191: Fix Alumni Foreign Key Constraints for Registry Schools
-- This migration ensures that alumni-related tables can store school_id (registry) 
-- and that institution_id doesn't cause foreign key failures for non-onboarded schools.

DO $$ 
BEGIN
    -- 1. alumni_jobs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_jobs' AND column_name = 'school_id') THEN
        ALTER TABLE public.alumni_jobs ADD COLUMN school_id TEXT REFERENCES public.school_registry(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alumni_jobs_institution_id_fkey' AND table_name = 'alumni_jobs') THEN
        ALTER TABLE public.alumni_jobs DROP CONSTRAINT alumni_jobs_institution_id_fkey;
    END IF;

    -- 2. alumni_businesses
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_businesses' AND column_name = 'school_id') THEN
        ALTER TABLE public.alumni_businesses ADD COLUMN school_id TEXT REFERENCES public.school_registry(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alumni_businesses_institution_id_fkey' AND table_name = 'alumni_businesses') THEN
        ALTER TABLE public.alumni_businesses DROP CONSTRAINT alumni_businesses_institution_id_fkey;
    END IF;

    -- 3. alumni_document_requests
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_document_requests' AND column_name = 'school_id') THEN
        ALTER TABLE public.alumni_document_requests ADD COLUMN school_id TEXT REFERENCES public.school_registry(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alumni_document_requests_institution_id_fkey' AND table_name = 'alumni_document_requests') THEN
        ALTER TABLE public.alumni_document_requests DROP CONSTRAINT alumni_document_requests_institution_id_fkey;
    END IF;

    -- 4. alumni_school_inbox
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_school_inbox' AND column_name = 'school_id') THEN
        ALTER TABLE public.alumni_school_inbox ADD COLUMN school_id TEXT REFERENCES public.school_registry(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alumni_school_inbox_institution_id_fkey' AND table_name = 'alumni_school_inbox') THEN
        ALTER TABLE public.alumni_school_inbox DROP CONSTRAINT alumni_school_inbox_institution_id_fkey;
    END IF;

    -- 5. alumni_success_stories
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_success_stories' AND column_name = 'school_id') THEN
        ALTER TABLE public.alumni_success_stories ADD COLUMN school_id TEXT REFERENCES public.school_registry(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alumni_success_stories_institution_id_fkey' AND table_name = 'alumni_success_stories') THEN
        ALTER TABLE public.alumni_success_stories DROP CONSTRAINT alumni_success_stories_institution_id_fkey;
    END IF;

    -- 6. alumni_event_rsvps
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_event_rsvps' AND column_name = 'school_id') THEN
        ALTER TABLE public.alumni_event_rsvps ADD COLUMN school_id TEXT REFERENCES public.school_registry(id) ON DELETE SET NULL;
    END IF;

    -- 7. alumni_messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alumni_messages' AND column_name = 'school_id') THEN
        ALTER TABLE public.alumni_messages ADD COLUMN school_id TEXT REFERENCES public.school_registry(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alumni_messages_institution_id_fkey' AND table_name = 'alumni_messages') THEN
        ALTER TABLE public.alumni_messages DROP CONSTRAINT alumni_messages_institution_id_fkey;
    END IF;

    -- 8. alumni_posts
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'alumni_posts_institution_id_fkey' AND table_name = 'alumni_posts') THEN
        ALTER TABLE public.alumni_posts DROP CONSTRAINT alumni_posts_institution_id_fkey;
    END IF;

END $$;
