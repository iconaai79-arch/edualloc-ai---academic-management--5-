-- Migration 462: Add DOS Handover Signature and Receipt Columns to school_remedial_sessions and school_remedial_payouts
-- Resolves custody chain tracking: Operations/Bursar -> DOS Receipt Confirmation -> Teacher Final Sign-off

DO $$
BEGIN
    -- 1. Extend school_remedial_sessions for Stage 4 DOS Handover Receipt
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions') THEN
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS dos_recipient_signature TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS dos_recipient_name TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS dos_recipient_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS dos_received_at TIMESTAMPTZ;
    END IF;

    -- 2. Extend school_remedial_payouts for complete multi-party audit trail
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_payouts') THEN
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS operations_manager_name TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS operations_disbursed_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS cash_voucher_ref TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS dos_recipient_signature TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS dos_recipient_name TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS dos_recipient_id TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS dos_received_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS dos_disbursed_by TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS paid_by_dos_name TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS paid_by_dos_id TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS teacher_signature_data_url TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
