
-- Migration 195: Universal Storage Provider Support
-- Prepares the system for hybrid storage (Google Drive + Supabase)
-- This adds metadata columns to all tables that handle media, allowing the app to know 
-- whether to fetch a file from Supabase or via the Google Drive API.

DO $$ 
BEGIN
    -- 1. Institutions (Branding Assets)
    ALTER TABLE public.institutions 
    ADD COLUMN IF NOT EXISTS logo_storage_provider TEXT DEFAULT 'supabase',
    ADD COLUMN IF NOT EXISTS logo_external_id TEXT,
    ADD COLUMN IF NOT EXISTS banner_storage_provider TEXT DEFAULT 'supabase',
    ADD COLUMN IF NOT EXISTS banner_external_id TEXT;

    -- 2. Users (Profile Assets)
    ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS avatar_storage_provider TEXT DEFAULT 'supabase',
    ADD COLUMN IF NOT EXISTS avatar_external_id TEXT;

    -- 3. Alumnae Members (Circle Profiles)
    ALTER TABLE public.alumnae_members 
    ADD COLUMN IF NOT EXISTS profile_photo_storage_provider TEXT DEFAULT 'supabase',
    ADD COLUMN IF NOT EXISTS profile_photo_external_id TEXT,
    ADD COLUMN IF NOT EXISTS cover_photo_storage_provider TEXT DEFAULT 'supabase',
    ADD COLUMN IF NOT EXISTS cover_photo_external_id TEXT;

    -- 4. Alumnae Businesses (Marketplace)
    ALTER TABLE public.alumni_businesses 
    ADD COLUMN IF NOT EXISTS logo_storage_provider TEXT DEFAULT 'supabase',
    ADD COLUMN IF NOT EXISTS logo_external_id TEXT;

    -- 5. Alumni Groups & Success Stories
    ALTER TABLE public.alumni_groups 
    ADD COLUMN IF NOT EXISTS image_storage_provider TEXT DEFAULT 'supabase',
    ADD COLUMN IF NOT EXISTS image_external_id TEXT;

    ALTER TABLE public.alumni_success_stories 
    ADD COLUMN IF NOT EXISTS image_storage_provider TEXT DEFAULT 'supabase',
    ADD COLUMN IF NOT EXISTS image_external_id TEXT;

    -- 6. Alumnae Social Feed (Media)
    ALTER TABLE public.alumni_posts 
    ADD COLUMN IF NOT EXISTS photo_storage_provider TEXT DEFAULT 'supabase',
    ADD COLUMN IF NOT EXISTS photo_external_id TEXT,
    ADD COLUMN IF NOT EXISTS video_storage_provider TEXT DEFAULT 'supabase',
    ADD COLUMN IF NOT EXISTS video_external_id TEXT;

    -- 7. School Engagement (Project Media)
    ALTER TABLE public.school_projects 
    ADD COLUMN IF NOT EXISTS image_storage_provider TEXT DEFAULT 'supabase',
    ADD COLUMN IF NOT EXISTS image_external_id TEXT;

    ALTER TABLE public.project_updates 
    ADD COLUMN IF NOT EXISTS image_storage_provider TEXT DEFAULT 'supabase',
    ADD COLUMN IF NOT EXISTS image_external_id TEXT;

    -- 8. Transport & Fleet (Vehicle Photos)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles') THEN
        ALTER TABLE public.vehicles 
        ADD COLUMN IF NOT EXISTS image_storage_provider TEXT DEFAULT 'supabase',
        ADD COLUMN IF NOT EXISTS image_external_id TEXT;
    END IF;

    -- 9. Car Sales & Listings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'car_sales_listings') THEN
        ALTER TABLE public.car_sales_listings 
        ADD COLUMN IF NOT EXISTS image_storage_provider TEXT DEFAULT 'supabase',
        ADD COLUMN IF NOT EXISTS image_external_id TEXT;
    END IF;

END $$;

NOTIFY pgrst, 'reload schema';
