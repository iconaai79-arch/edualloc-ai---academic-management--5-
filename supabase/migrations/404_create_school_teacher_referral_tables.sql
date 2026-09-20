-- ==============================================================================
-- Migration 404: School-to-School Teacher Referral Program & First Invoice Commission
-- Description: Creates tables for:
--   1. teacher_referral_profiles: Unique codes, links, payout details, and earnings.
--   2. school_referral_leads: Live pipeline tracking from registration to 1st invoice payment.
--   3. referral_program_settings: Institutional / platform commission rates & settings.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Create teacher_referral_profiles table
    IF to_regclass('public.teacher_referral_profiles') IS NULL THEN
        CREATE TABLE public.teacher_referral_profiles (
            id TEXT PRIMARY KEY DEFAULT ('trp_' || lower(substr(md5(random()::text || clock_timestamp()::text), 1, 16))),
            teacher_id TEXT NOT NULL,
            institution_id TEXT NOT NULL,
            referral_code TEXT UNIQUE NOT NULL,
            custom_slug TEXT UNIQUE,
            referral_link TEXT,
            qr_code_url TEXT,
            payout_phone TEXT,
            payout_channel TEXT DEFAULT 'mpesa',
            payout_account_name TEXT,
            payout_bank_name TEXT,
            payout_account_number TEXT,
            total_earned NUMERIC DEFAULT 0,
            total_withdrawn NUMERIC DEFAULT 0,
            pending_commission NUMERIC DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- 2. Create school_referral_leads table
    IF to_regclass('public.school_referral_leads') IS NULL THEN
        CREATE TABLE public.school_referral_leads (
            id TEXT PRIMARY KEY DEFAULT ('srl_' || lower(substr(md5(random()::text || clock_timestamp()::text), 1, 16))),
            referral_profile_id TEXT REFERENCES public.teacher_referral_profiles(id) ON DELETE SET NULL,
            referring_teacher_id TEXT NOT NULL,
            referring_institution_id TEXT NOT NULL,
            referred_school_name TEXT NOT NULL,
            referred_institution_id TEXT,
            contact_person_name TEXT,
            contact_phone TEXT,
            contact_email TEXT,
            status TEXT DEFAULT 'lead_captured',
            first_invoice_id TEXT,
            first_invoice_number TEXT,
            first_invoice_amount NUMERIC,
            first_invoice_issued_at TIMESTAMPTZ,
            first_invoice_paid_at TIMESTAMPTZ,
            commission_rate_type TEXT DEFAULT 'percentage',
            commission_rate NUMERIC DEFAULT 15.0,
            commission_amount NUMERIC DEFAULT 0,
            commission_status TEXT DEFAULT 'pending_payment',
            payout_reference TEXT,
            payout_disbursed_at TIMESTAMPTZ,
            payout_disbursed_by TEXT,
            notes TEXT,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- 3. Create referral_program_settings table
    IF to_regclass('public.referral_program_settings') IS NULL THEN
        CREATE TABLE public.referral_program_settings (
            id TEXT PRIMARY KEY DEFAULT 'default',
            is_program_active BOOLEAN DEFAULT true,
            default_commission_type TEXT DEFAULT 'percentage',
            default_commission_rate NUMERIC DEFAULT 15.0,
            fixed_commission_amount NUMERIC DEFAULT 5000.0,
            min_invoice_amount_for_commission NUMERIC DEFAULT 10000.0,
            payout_terms_days INTEGER DEFAULT 14,
            terms_and_conditions TEXT,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Insert default platform settings row
        INSERT INTO public.referral_program_settings (
            id,
            is_program_active,
            default_commission_type,
            default_commission_rate,
            fixed_commission_amount,
            min_invoice_amount_for_commission,
            payout_terms_days,
            terms_and_conditions
        ) VALUES (
            'default',
            true,
            'percentage',
            15.0,
            5000.0,
            10000.0,
            14,
            'Referral commission is earned upon successful clearance of the referred institution''s first subscription invoice.'
        ) ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 4. Create Indexes for High Performance Querying
DO $$
BEGIN
    -- teacher_referral_profiles indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'teacher_referral_profiles' AND indexname = 'idx_teacher_referral_profiles_teacher_id') THEN
        CREATE INDEX idx_teacher_referral_profiles_teacher_id ON public.teacher_referral_profiles(teacher_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'teacher_referral_profiles' AND indexname = 'idx_teacher_referral_profiles_code') THEN
        CREATE INDEX idx_teacher_referral_profiles_code ON public.teacher_referral_profiles(referral_code);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'teacher_referral_profiles' AND indexname = 'idx_teacher_referral_profiles_metadata_gin') THEN
        CREATE INDEX idx_teacher_referral_profiles_metadata_gin ON public.teacher_referral_profiles USING gin (metadata);
    END IF;

    -- school_referral_leads indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'school_referral_leads' AND indexname = 'idx_school_referral_leads_teacher') THEN
        CREATE INDEX idx_school_referral_leads_teacher ON public.school_referral_leads(referring_teacher_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'school_referral_leads' AND indexname = 'idx_school_referral_leads_referred_inst') THEN
        CREATE INDEX idx_school_referral_leads_referred_inst ON public.school_referral_leads(referred_institution_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'school_referral_leads' AND indexname = 'idx_school_referral_leads_status') THEN
        CREATE INDEX idx_school_referral_leads_status ON public.school_referral_leads(status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'school_referral_leads' AND indexname = 'idx_school_referral_leads_first_invoice') THEN
        CREATE INDEX idx_school_referral_leads_first_invoice ON public.school_referral_leads(first_invoice_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'school_referral_leads' AND indexname = 'idx_school_referral_leads_metadata_gin') THEN
        CREATE INDEX idx_school_referral_leads_metadata_gin ON public.school_referral_leads USING gin (metadata);
    END IF;
END $$;

-- 5. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.teacher_referral_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_referral_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_program_settings ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users and anon read where appropriate
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated full access to teacher_referral_profiles" ON public.teacher_referral_profiles;
    CREATE POLICY "Allow authenticated full access to teacher_referral_profiles"
        ON public.teacher_referral_profiles
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon read of active referral codes" ON public.teacher_referral_profiles;
    CREATE POLICY "Allow anon read of active referral codes"
        ON public.teacher_referral_profiles
        FOR SELECT
        TO anon
        USING (is_active = true);

    DROP POLICY IF EXISTS "Allow authenticated full access to school_referral_leads" ON public.school_referral_leads;
    CREATE POLICY "Allow authenticated full access to school_referral_leads"
        ON public.school_referral_leads
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow anon insert referral leads" ON public.school_referral_leads;
    CREATE POLICY "Allow anon insert referral leads"
        ON public.school_referral_leads
        FOR INSERT
        TO anon
        WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all read to referral_program_settings" ON public.referral_program_settings;
    CREATE POLICY "Allow all read to referral_program_settings"
        ON public.referral_program_settings
        FOR SELECT
        TO authenticated, anon
        USING (true);

    DROP POLICY IF EXISTS "Allow authenticated write to referral_program_settings" ON public.referral_program_settings;
    CREATE POLICY "Allow authenticated write to referral_program_settings"
        ON public.referral_program_settings
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
END $$;

NOTIFY pgrst, 'reload schema';
