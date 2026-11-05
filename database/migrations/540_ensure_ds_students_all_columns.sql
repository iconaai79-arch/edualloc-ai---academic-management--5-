-- Migration: 540_ensure_ds_students_all_columns.sql
-- Description: Ensures id_number and all companion columns exist on public.ds_students for 100% SQL import and sync compatibility.

ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS course_duration_days INTEGER DEFAULT 0;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS remaining_days INTEGER DEFAULT 0;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS prior_attended_days INTEGER DEFAULT 0;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS preferred_lesson_hours TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS pdl_status TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS passport_photo TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS webauthn_credentials JSONB;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS fingerprint_template TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS activation_date TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS license_category TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS license_type_interested TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS theory_progress_percent INTEGER DEFAULT 0;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS practical_progress_percent INTEGER DEFAULT 0;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS theory_test_score INTEGER;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS practical_test_score INTEGER;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS ntsa_booking_status TEXT;

-- Auto-synchronize national_id and id_number if either is missing
UPDATE public.ds_students SET id_number = national_id WHERE id_number IS NULL AND national_id IS NOT NULL;
UPDATE public.ds_students SET national_id = id_number WHERE national_id IS NULL AND id_number IS NOT NULL;

-- Create performance indexes for queries and tenant isolation
CREATE INDEX IF NOT EXISTS idx_ds_students_id_number ON public.ds_students(id_number);
CREATE INDEX IF NOT EXISTS idx_ds_students_branch_id ON public.ds_students(branch_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

