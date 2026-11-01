-- Migration 530: Comprehensive Fix for Counties Table Import (Adds all camelCase & snake_case columns)
-- Description: The database dump/backup contains camelCase column names enclosed in double quotes:
-- "phoneNumber", "logoUrl", "letterheadUrl", "adminName", "governorName", "deputyGovernorName", etc.
-- This script adds all of them so imports will never fail on missing columns.

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.counties (
    id TEXT PRIMARY KEY
);

-- 2. Add all camelCase columns (with double quotes) and snake_case equivalents
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "email" TEXT;

-- Phone
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Status & Timestamps
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Location & Metadata
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "location" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "headquarters" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Administrators & Officials
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "adminName" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS admin_name TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "adminId" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS admin_id TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "governorName" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS governor_name TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "deputyGovernorName" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS deputy_governor_name TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "directorOfEducation" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS director_of_education TEXT;

-- Branding & Assets
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "letterheadUrl" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS letterhead_url TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "sealUrl" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS seal_url TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "stampUrl" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS stamp_url TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "signatureUrl" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "primaryColor" TEXT DEFAULT '#4f46e5';
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#4f46e5';
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "secondaryColor" TEXT DEFAULT '#0f172a';
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#0f172a';
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "motto" TEXT;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "website" TEXT;

-- Electoral & Finance
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "registeredVoters" NUMERIC DEFAULT 0;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS registered_voters NUMERIC DEFAULT 0;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS "smsBalance" NUMERIC DEFAULT 0;
ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS sms_balance NUMERIC DEFAULT 0;

-- 3. Synchronize existing values between camelCase and snake_case
UPDATE public.counties SET "phoneNumber" = COALESCE("phoneNumber", phone_number), phone_number = COALESCE(phone_number, "phoneNumber");
UPDATE public.counties SET "adminName" = COALESCE("adminName", admin_name), admin_name = COALESCE(admin_name, "adminName");
UPDATE public.counties SET "adminId" = COALESCE("adminId", admin_id), admin_id = COALESCE(admin_id, "adminId");
UPDATE public.counties SET "governorName" = COALESCE("governorName", governor_name), governor_name = COALESCE(governor_name, "governorName");
UPDATE public.counties SET "deputyGovernorName" = COALESCE("deputyGovernorName", deputy_governor_name), deputy_governor_name = COALESCE(deputy_governor_name, "deputyGovernorName");
UPDATE public.counties SET "logoUrl" = COALESCE("logoUrl", logo_url), logo_url = COALESCE(logo_url, "logoUrl");
ALTER TABLE public.counties ALTER COLUMN id DROP DEFAULT;

-- 4. Automatic sync trigger so both variants remain populated on future writes
CREATE OR REPLACE FUNCTION public.sync_counties_all_columns()
RETURNS TRIGGER AS $$
BEGIN
    NEW."phoneNumber" := COALESCE(NEW."phoneNumber", NEW.phone_number);
    NEW.phone_number := COALESCE(NEW.phone_number, NEW."phoneNumber");

    NEW."adminName" := COALESCE(NEW."adminName", NEW.admin_name);
    NEW.admin_name := COALESCE(NEW.admin_name, NEW."adminName");

    NEW."adminId" := COALESCE(NEW."adminId", NEW.admin_id);
    NEW.admin_id := COALESCE(NEW.admin_id, NEW."adminId");

    NEW."governorName" := COALESCE(NEW."governorName", NEW.governor_name);
    NEW.governor_name := COALESCE(NEW.governor_name, NEW."governorName");

    NEW."deputyGovernorName" := COALESCE(NEW."deputyGovernorName", NEW.deputy_governor_name);
    NEW.deputy_governor_name := COALESCE(NEW.deputy_governor_name, NEW."deputyGovernorName");

    NEW."logoUrl" := COALESCE(NEW."logoUrl", NEW.logo_url);
    NEW.logo_url := COALESCE(NEW.logo_url, NEW."logoUrl");

    NEW."letterheadUrl" := COALESCE(NEW."letterheadUrl", NEW.letterhead_url);
    NEW.letterhead_url := COALESCE(NEW.letterhead_url, NEW."letterheadUrl");

    NEW."sealUrl" := COALESCE(NEW."sealUrl", NEW.seal_url);
    NEW.seal_url := COALESCE(NEW.seal_url, NEW."sealUrl");

    NEW."stampUrl" := COALESCE(NEW."stampUrl", NEW.stamp_url);
    NEW.stamp_url := COALESCE(NEW.stamp_url, NEW."stampUrl");

    NEW."signatureUrl" := COALESCE(NEW."signatureUrl", NEW.signature_url);
    NEW.signature_url := COALESCE(NEW.signature_url, NEW."signatureUrl");

    NEW."primaryColor" := COALESCE(NEW."primaryColor", NEW.primary_color);
    NEW.primary_color := COALESCE(NEW.primary_color, NEW."primaryColor");

    NEW."secondaryColor" := COALESCE(NEW."secondaryColor", NEW.secondary_color);
    NEW.secondary_color := COALESCE(NEW.secondary_color, NEW."secondaryColor");

    NEW."postalCode" := COALESCE(NEW."postalCode", NEW.postal_code);
    NEW.postal_code := COALESCE(NEW.postal_code, NEW."postalCode");

    NEW."directorOfEducation" := COALESCE(NEW."directorOfEducation", NEW.director_of_education);
    NEW.director_of_education := COALESCE(NEW.director_of_education, NEW."directorOfEducation");

    NEW."registeredVoters" := COALESCE(NEW."registeredVoters", NEW.registered_voters);
    NEW.registered_voters := COALESCE(NEW.registered_voters, NEW."registeredVoters");

    NEW."smsBalance" := COALESCE(NEW."smsBalance", NEW.sms_balance);
    NEW.sms_balance := COALESCE(NEW.sms_balance, NEW."smsBalance");

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_counties_all_columns ON public.counties;
CREATE TRIGGER trg_sync_counties_all_columns
BEFORE INSERT OR UPDATE ON public.counties
FOR EACH ROW
EXECUTE FUNCTION public.sync_counties_all_columns();

-- 5. Notify PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
