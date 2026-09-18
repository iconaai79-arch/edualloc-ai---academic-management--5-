-- ==============================================================================
-- Migration: 401_add_visitor_auto_finalize_to_institutions.sql
-- Description: Adds visitor_auto_finalize_enabled, visitor_auto_finalize_time,
--              notify_host_on_visitor_arrival, visitor_arrival_sms_template, and
--              metadata columns to institutions table.
-- ==============================================================================

DO $$
BEGIN
    IF to_regclass('public.institutions') IS NOT NULL THEN
        -- visitor_auto_finalize_enabled
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'institutions' 
              AND column_name = 'visitor_auto_finalize_enabled'
        ) THEN
            ALTER TABLE public.institutions ADD COLUMN visitor_auto_finalize_enabled BOOLEAN DEFAULT FALSE;
        END IF;

        -- visitor_auto_finalize_time
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'institutions' 
              AND column_name = 'visitor_auto_finalize_time'
        ) THEN
            ALTER TABLE public.institutions ADD COLUMN visitor_auto_finalize_time TEXT DEFAULT '18:00';
        END IF;

        -- notify_host_on_visitor_arrival
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'institutions' 
              AND column_name = 'notify_host_on_visitor_arrival'
        ) THEN
            ALTER TABLE public.institutions ADD COLUMN notify_host_on_visitor_arrival BOOLEAN DEFAULT TRUE;
        END IF;

        -- visitor_arrival_sms_template
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'institutions' 
              AND column_name = 'visitor_arrival_sms_template'
        ) THEN
            ALTER TABLE public.institutions ADD COLUMN visitor_arrival_sms_template TEXT;
        END IF;

        -- metadata
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'institutions' 
              AND column_name = 'metadata'
        ) THEN
            ALTER TABLE public.institutions ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        END IF;

        -- kiosk_security_pin
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'institutions' 
              AND column_name = 'kiosk_security_pin'
        ) THEN
            ALTER TABLE public.institutions ADD COLUMN kiosk_security_pin TEXT DEFAULT '1234';
        END IF;

        -- kiosk_status
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'institutions' 
              AND column_name = 'kiosk_status'
        ) THEN
            ALTER TABLE public.institutions ADD COLUMN kiosk_status TEXT DEFAULT 'active';
        END IF;
    END IF;
END $$;
