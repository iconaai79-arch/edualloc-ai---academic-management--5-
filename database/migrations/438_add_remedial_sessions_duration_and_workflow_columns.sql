-- Migration 438: Add duration_minutes and workflow columns to school_remedial_sessions
-- Resolves: "[api/records] Schema cache stale: stripping un-cached column 'duration_minutes' for [school_remedial_sessions]"
-- Ensures complete persistence for lesson duration calculations, multi-stage approval workflow, and metadata.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions') THEN
        -- Duration and Time Calculation Columns
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS hours NUMERIC DEFAULT 1;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS scheduled_start_time TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS scheduled_end_time TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS scheduled_duration_minutes INTEGER DEFAULT 60;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS early_login_minutes_omitted NUMERIC DEFAULT 0;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS capped_at_timetable BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS logged_out_early BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS is_duty_lesson BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS qr_token TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

        -- Stage 2: Teacher on Duty Verification & Rejection
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duty_approved BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duty_approved_by TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duty_approved_by_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duty_approved_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duty_notes TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duty_rejected BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duty_rejection_reason TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duty_rejected_by TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duty_rejected_at TIMESTAMPTZ;

        -- Stage 3: Headteacher / Principal Authorization & Review
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS headteacher_approved BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS headteacher_approved_by TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS headteacher_approved_by_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS headteacher_approved_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS headteacher_notes TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS headteacher_rejected BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS headteacher_rejection_reason TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS headteacher_rejected_by TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS headteacher_rejected_at TIMESTAMPTZ;

        -- Stage 4: Operations Manager Cash Handover to DOS
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS operations_disbursed BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS operations_manager_name TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS operations_manager_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS operations_disbursed_by TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS operations_disbursed_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS cash_disbursed_to_dos_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS cash_voucher_ref TEXT;

        -- Stage 5: DOS Cash Payment to Teacher with On-Screen Signature
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS paid_by_dos_name TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS paid_by_dos_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS teacher_signature_data_url TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS payment_method TEXT;
    END IF;
END $$;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_remedial_sessions_inst_status ON public.school_remedial_sessions (institution_id, status);
CREATE INDEX IF NOT EXISTS idx_remedial_sessions_teacher_date ON public.school_remedial_sessions (teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_remedial_sessions_date ON public.school_remedial_sessions (date);

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
