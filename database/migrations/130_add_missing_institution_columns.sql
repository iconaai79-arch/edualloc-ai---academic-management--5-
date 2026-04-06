-- Add missing institution configuration columns used in SettingsManager profile updates
-- To be run in Supabase SQL Editor

ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS ai_model_tier TEXT DEFAULT 'premium';

ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS parent_absence_notifications_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS farmer_sms_billing_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS use_allocation_requests BOOLEAN DEFAULT TRUE;

-- Safety check for slug column (if not already added via previous migration)
ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Handle uniqueness for slug if not already present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_institutions_slug') THEN
        CREATE UNIQUE INDEX idx_institutions_slug ON public.institutions(slug) WHERE (slug IS NOT NULL AND slug <> '');
    END IF;
END $$;
