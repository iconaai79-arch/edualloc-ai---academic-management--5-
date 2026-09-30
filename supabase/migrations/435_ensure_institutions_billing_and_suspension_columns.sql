-- ==============================================================================
-- Migration: 435_ensure_institutions_billing_and_suspension_columns.sql
-- Description: Ensures is_suspended_for_billing and related billing columns exist
--              on public.institutions table to prevent PGRST204 schema cache stale warnings
-- ==============================================================================

DO $$
BEGIN
    IF to_regclass('public.institutions') IS NOT NULL THEN
        -- is_suspended_for_billing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'institutions' 
              AND column_name = 'is_suspended_for_billing'
        ) THEN
            ALTER TABLE public.institutions ADD COLUMN is_suspended_for_billing BOOLEAN DEFAULT FALSE;
        END IF;

        -- billing_model
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'institutions' 
              AND column_name = 'billing_model'
        ) THEN
            ALTER TABLE public.institutions ADD COLUMN billing_model TEXT DEFAULT 'fixed';
        END IF;

        -- rate_per_student
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'institutions' 
              AND column_name = 'rate_per_student'
        ) THEN
            ALTER TABLE public.institutions ADD COLUMN rate_per_student DECIMAL(12, 2) DEFAULT 0.00;
        END IF;

        -- billing_cycle_anchor
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'institutions' 
              AND column_name = 'billing_cycle_anchor'
        ) THEN
            ALTER TABLE public.institutions ADD COLUMN billing_cycle_anchor TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        END IF;

        -- subscription_ends_at
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'institutions' 
              AND column_name = 'subscription_ends_at'
        ) THEN
            ALTER TABLE public.institutions ADD COLUMN subscription_ends_at TIMESTAMP WITH TIME ZONE;
        END IF;

        -- trial_ends_at
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'institutions' 
              AND column_name = 'trial_ends_at'
        ) THEN
            ALTER TABLE public.institutions ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;
END $$;
