-- ============================================================================
-- MIGRATION 549: MIGRATE ALL LETTERHEAD & STORAGE URLS TO TALKSASA (/storage/eduai/)
-- Ensures all letterheads, logos, footers, stamps, and assets point to Talksasa local storage.
-- Safe, idempotent, and updates both snake_case and camelCase columns.
-- ============================================================================

DO $$
DECLARE
    old_prefix CONSTANT TEXT := 'https://hualwvffjrkoapauelfx.supabase.co/storage/v1/object/public/eduai/';
    new_prefix CONSTANT TEXT := '/storage/eduai/';
    r RECORD;
BEGIN
    RAISE NOTICE 'Starting Migration 549: Normalizing storage URLs to Talksasa /storage/eduai/...';

    -- 1. system_settings (global branding, logo, letterhead, footer)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_settings') THEN
        UPDATE public.system_settings
        SET data = REPLACE(data::text, old_prefix, new_prefix)::jsonb
        WHERE data::text LIKE '%' || old_prefix || '%';
        RAISE NOTICE 'Migrated system_settings branding URLs';
    END IF;

    -- 2. institutions (logo_url, header_image_url, footer_image_url, stamp_url, letterhead_config, data)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'institutions') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'logo_url') THEN
            UPDATE public.institutions SET logo_url = REPLACE(logo_url, old_prefix, new_prefix) WHERE logo_url LIKE '%' || old_prefix || '%';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'logoUrl') THEN
            UPDATE public.institutions SET "logoUrl" = REPLACE("logoUrl", old_prefix, new_prefix) WHERE "logoUrl" LIKE '%' || old_prefix || '%';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'header_image_url') THEN
            UPDATE public.institutions SET header_image_url = REPLACE(header_image_url, old_prefix, new_prefix) WHERE header_image_url LIKE '%' || old_prefix || '%';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'headerImageUrl') THEN
            UPDATE public.institutions SET "headerImageUrl" = REPLACE("headerImageUrl", old_prefix, new_prefix) WHERE "headerImageUrl" LIKE '%' || old_prefix || '%';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'footer_image_url') THEN
            UPDATE public.institutions SET footer_image_url = REPLACE(footer_image_url, old_prefix, new_prefix) WHERE footer_image_url LIKE '%' || old_prefix || '%';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'footerImageUrl') THEN
            UPDATE public.institutions SET "footerImageUrl" = REPLACE("footerImageUrl", old_prefix, new_prefix) WHERE "footerImageUrl" LIKE '%' || old_prefix || '%';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'stamp_url') THEN
            UPDATE public.institutions SET stamp_url = REPLACE(stamp_url, old_prefix, new_prefix) WHERE stamp_url LIKE '%' || old_prefix || '%';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'stampUrl') THEN
            UPDATE public.institutions SET "stampUrl" = REPLACE("stampUrl", old_prefix, new_prefix) WHERE "stampUrl" LIKE '%' || old_prefix || '%';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'letterhead_config') THEN
            UPDATE public.institutions SET letterhead_config = REPLACE(letterhead_config::text, old_prefix, new_prefix)::jsonb WHERE letterhead_config::text LIKE '%' || old_prefix || '%';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'data') THEN
            UPDATE public.institutions SET data = REPLACE(data::text, old_prefix, new_prefix)::jsonb WHERE data::text LIKE '%' || old_prefix || '%';
        END IF;
        RAISE NOTICE 'Migrated institutions letterheads & branding URLs';
    END IF;

    -- 3. retail_inventory_items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_inventory_items') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_inventory_items' AND column_name = 'image_url') THEN
            UPDATE public.retail_inventory_items SET image_url = REPLACE(image_url, old_prefix, new_prefix) WHERE image_url LIKE '%' || old_prefix || '%';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_inventory_items' AND column_name = 'imageUrl') THEN
            UPDATE public.retail_inventory_items SET "imageUrl" = REPLACE("imageUrl", old_prefix, new_prefix) WHERE "imageUrl" LIKE '%' || old_prefix || '%';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_inventory_items' AND column_name = 'images') THEN
            UPDATE public.retail_inventory_items SET images = REPLACE(images::text, old_prefix, new_prefix)::jsonb WHERE images::text LIKE '%' || old_prefix || '%';
        END IF;
    END IF;

    -- 4. users & students
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'profile_photo_url') THEN
            UPDATE public.users SET profile_photo_url = REPLACE(profile_photo_url, old_prefix, new_prefix) WHERE profile_photo_url LIKE '%' || old_prefix || '%';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'profilePhotoUrl') THEN
            UPDATE public.users SET "profilePhotoUrl" = REPLACE("profilePhotoUrl", old_prefix, new_prefix) WHERE "profilePhotoUrl" LIKE '%' || old_prefix || '%';
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'photo_url') THEN
            UPDATE public.students SET photo_url = REPLACE(photo_url, old_prefix, new_prefix) WHERE photo_url LIKE '%' || old_prefix || '%';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'photoUrl') THEN
            UPDATE public.students SET "photoUrl" = REPLACE("photoUrl", old_prefix, new_prefix) WHERE "photoUrl" LIKE '%' || old_prefix || '%';
        END IF;
    END IF;

    RAISE NOTICE 'Migration 549 completed successfully.';
END $$;
