-- Migration 123: Add NCBA Configuration to Institutions
-- Standardizes payment integration support for all tenants

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='institutions' AND column_name='ncba_config') THEN
        ALTER TABLE public.institutions ADD COLUMN ncba_config JSONB;
    END IF;
END $$;
