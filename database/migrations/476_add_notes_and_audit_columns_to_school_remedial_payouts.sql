-- Migration 476: Add notes and extended audit columns to school_remedial_payouts
-- Resolves: "[api/records] Schema cache stale: stripping un-cached column 'notes' for [school_remedial_payouts]"

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_payouts') THEN
        -- Add notes column
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS notes TEXT;

        -- Add multi-tier workflow & audit trail columns
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS session_ids JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS headteacher_authorized_by TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS headteacher_authorized_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS operations_disbursed_by TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS dos_disbursed_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS opening_balance_included NUMERIC DEFAULT 0;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS earned_amount NUMERIC DEFAULT 0;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Reload schema cache immediately
NOTIFY pgrst, 'reload schema';
