-- Migration 522: Add Header Image URL and Branding Columns to Institutions Table
-- Resolves: "[api/records] Schema cache stale: stripping un-cached column 'header_image_url' for [institutions]"

SET statement_timeout = '1min';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'institutions'
    ) THEN
        -- 1. Ensure header_image_url and aliases exist on public.institutions
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS header_image_url TEXT;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "headerImageUrl" TEXT;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS letterhead_url TEXT;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "letterheadUrl" TEXT;

        -- 2. Ensure stamp and footer branding columns exist
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS stamp_url TEXT;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "stampUrl" TEXT;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS footer_image_url TEXT;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "footerImageUrl" TEXT;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS logo_url TEXT;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

        -- 3. Ensure letterhead_config JSONB exists
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS letterhead_config JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "letterheadConfig" JSONB DEFAULT '{}'::jsonb;

        RAISE NOTICE 'Successfully added branding image columns to public.institutions';
    END IF;
END $$;

-- 4. Bidirectional synchronization trigger for institutions branding columns
CREATE OR REPLACE FUNCTION public.sync_institutions_branding_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync header_image_url <-> "headerImageUrl" <-> letterhead_url <-> "letterheadUrl"
    IF NEW.header_image_url IS NOT NULL AND NEW.header_image_url != '' THEN
        NEW."headerImageUrl" := NEW.header_image_url;
        NEW.letterhead_url := COALESCE(NEW.letterhead_url, NEW.header_image_url);
        NEW."letterheadUrl" := COALESCE(NEW."letterheadUrl", NEW.header_image_url);
    ELSIF NEW."headerImageUrl" IS NOT NULL AND NEW."headerImageUrl" != '' THEN
        NEW.header_image_url := NEW."headerImageUrl";
        NEW.letterhead_url := COALESCE(NEW.letterhead_url, NEW."headerImageUrl");
        NEW."letterheadUrl" := COALESCE(NEW."letterheadUrl", NEW."headerImageUrl");
    ELSIF NEW.letterhead_url IS NOT NULL AND NEW.letterhead_url != '' THEN
        NEW.header_image_url := NEW.letterhead_url;
        NEW."headerImageUrl" := NEW.letterhead_url;
        NEW."letterheadUrl" := NEW.letterhead_url;
    ELSIF NEW."letterheadUrl" IS NOT NULL AND NEW."letterheadUrl" != '' THEN
        NEW.header_image_url := NEW."letterheadUrl";
        NEW."headerImageUrl" := NEW."letterheadUrl";
        NEW.letterhead_url := NEW."letterheadUrl";
    END IF;

    -- Sync stamp_url <-> "stampUrl"
    IF NEW.stamp_url IS NOT NULL AND NEW.stamp_url != '' THEN
        NEW."stampUrl" := NEW.stamp_url;
    ELSIF NEW."stampUrl" IS NOT NULL AND NEW."stampUrl" != '' THEN
        NEW.stamp_url := NEW."stampUrl";
    END IF;

    -- Sync footer_image_url <-> "footerImageUrl"
    IF NEW.footer_image_url IS NOT NULL AND NEW.footer_image_url != '' THEN
        NEW."footerImageUrl" := NEW.footer_image_url;
    ELSIF NEW."footerImageUrl" IS NOT NULL AND NEW."footerImageUrl" != '' THEN
        NEW.footer_image_url := NEW."footerImageUrl";
    END IF;

    -- Sync logo_url <-> "logoUrl"
    IF NEW.logo_url IS NOT NULL AND NEW.logo_url != '' THEN
        NEW."logoUrl" := NEW.logo_url;
    ELSIF NEW."logoUrl" IS NOT NULL AND NEW."logoUrl" != '' THEN
        NEW.logo_url := NEW."logoUrl";
    END IF;

    -- Keep letterhead_config JSONB synced with the latest URLs
    NEW.letterhead_config := COALESCE(NEW.letterhead_config, '{}'::jsonb);
    IF NEW.header_image_url IS NOT NULL AND NEW.header_image_url != '' THEN
        NEW.letterhead_config := jsonb_set(NEW.letterhead_config, '{headerImageUrl}', to_jsonb(NEW.header_image_url), true);
    END IF;
    IF NEW.footer_image_url IS NOT NULL AND NEW.footer_image_url != '' THEN
        NEW.letterhead_config := jsonb_set(NEW.letterhead_config, '{footerImageUrl}', to_jsonb(NEW.footer_image_url), true);
    END IF;
    IF NEW.stamp_url IS NOT NULL AND NEW.stamp_url != '' THEN
        NEW.letterhead_config := jsonb_set(NEW.letterhead_config, '{stampImageUrl}', to_jsonb(NEW.stamp_url), true);
    END IF;
    IF NEW.logo_url IS NOT NULL AND NEW.logo_url != '' THEN
        NEW.letterhead_config := jsonb_set(NEW.letterhead_config, '{logoUrl}', to_jsonb(NEW.logo_url), true);
    END IF;
    NEW."letterheadConfig" := NEW.letterhead_config;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_institutions_branding ON public.institutions;
CREATE TRIGGER trg_sync_institutions_branding
    BEFORE INSERT OR UPDATE ON public.institutions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_institutions_branding_columns();

-- 5. Backfill existing letterhead_config values into dedicated columns if empty
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'institutions'
    ) THEN
        UPDATE public.institutions
        SET header_image_url = letterhead_config->>'headerImageUrl',
            "headerImageUrl" = letterhead_config->>'headerImageUrl',
            letterhead_url = letterhead_config->>'headerImageUrl',
            "letterheadUrl" = letterhead_config->>'headerImageUrl'
        WHERE (header_image_url IS NULL OR header_image_url = '')
          AND letterhead_config IS NOT NULL 
          AND letterhead_config->>'headerImageUrl' IS NOT NULL;

        UPDATE public.institutions
        SET footer_image_url = letterhead_config->>'footerImageUrl',
            "footerImageUrl" = letterhead_config->>'footerImageUrl'
        WHERE (footer_image_url IS NULL OR footer_image_url = '')
          AND letterhead_config IS NOT NULL 
          AND letterhead_config->>'footerImageUrl' IS NOT NULL;

        UPDATE public.institutions
        SET stamp_url = letterhead_config->>'stampImageUrl',
            "stampUrl" = letterhead_config->>'stampImageUrl'
        WHERE (stamp_url IS NULL OR stamp_url = '')
          AND letterhead_config IS NOT NULL 
          AND letterhead_config->>'stampImageUrl' IS NOT NULL;
    END IF;
END $$;

-- 6. Reload PostgREST schema cache immediately
ANALYZE public.institutions;
NOTIFY pgrst, 'reload schema';
