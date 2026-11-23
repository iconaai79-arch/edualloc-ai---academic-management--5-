-- Fix: column "staff_id" does not exist when syncing biometric (Dahua) logs.
-- Ensures staff_attendance_daily has the snake_case columns used by api/dahua-webhook.ts.
ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS attendance_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS first_in TIMESTAMPTZ;
ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS last_out TIMESTAMPTZ;
ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0;
ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC DEFAULT 0;
ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS late_minutes NUMERIC DEFAULT 0;
ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS early_leave_minutes NUMERIC DEFAULT 0;
ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS punch_count NUMERIC DEFAULT 0;
ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present';
ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Backfill from camelCase columns if they exist.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staff_attendance_daily' AND column_name='staffId') THEN
    UPDATE public.staff_attendance_daily SET staff_id = "staffId" WHERE staff_id IS NULL AND "staffId" IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='staff_attendance_daily' AND column_name='institutionId') THEN
    UPDATE public.staff_attendance_daily SET institution_id = "institutionId" WHERE institution_id IS NULL AND "institutionId" IS NOT NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
