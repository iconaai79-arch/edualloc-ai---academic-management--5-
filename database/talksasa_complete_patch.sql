-- ============================================================================
-- Talksasa Master Compatibility Patch: Complete Driving School & System Settings
-- Self-contained, idempotent fix for ds_students, ds_invoices, ds_payments, and system_settings
-- ============================================================================

-- 1. Ensure system_settings table exists with proper types
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY,
    data JSONB DEFAULT '{}'::jsonb,
    status TEXT,
    ts BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'system_settings' 
          AND column_name = 'id' 
          AND data_type = 'integer'
    ) THEN
        ALTER TABLE public.system_settings ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.system_settings ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;
END $$;

INSERT INTO public.system_settings (id, data, updated_at)
VALUES ('1', '{}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure ds_students table exists & has all columns
CREATE TABLE IF NOT EXISTS public.ds_students (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    admission_number TEXT,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    national_id TEXT,
    id_number TEXT,
    course_category TEXT,
    license_category TEXT,
    license_type_interested TEXT,
    course_duration_days INTEGER DEFAULT 0,
    remaining_days INTEGER DEFAULT 0,
    prior_attended_days INTEGER DEFAULT 0,
    preferred_lesson_hours TEXT,
    transmission_type TEXT,
    status TEXT DEFAULT 'active',
    pdl_status TEXT,
    branch_id TEXT,
    user_id TEXT,
    notes TEXT,
    passport_photo TEXT,
    passport_number TEXT,
    webauthn_credentials JSONB,
    fingerprint_template TEXT,
    payment_status TEXT,
    activation_date TEXT,
    checkout_request_id TEXT,
    theory_progress_percent INTEGER DEFAULT 0,
    practical_progress_percent INTEGER DEFAULT 0,
    theory_test_score INTEGER,
    practical_test_score INTEGER,
    ntsa_booking_status TEXT,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS course_category TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS license_category TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS license_type_interested TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS course_duration_days INTEGER DEFAULT 0;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS remaining_days INTEGER DEFAULT 0;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS prior_attended_days INTEGER DEFAULT 0;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS preferred_lesson_hours TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS transmission_type TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS pdl_status TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS passport_photo TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS webauthn_credentials JSONB;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS fingerprint_template TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS activation_date TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS theory_progress_percent INTEGER DEFAULT 0;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS practical_progress_percent INTEGER DEFAULT 0;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS theory_test_score INTEGER;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS practical_test_score INTEGER;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS ntsa_booking_status TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 3. Ensure ds_invoices table exists & has all columns
CREATE TABLE IF NOT EXISTS public.ds_invoices (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    student_id TEXT,
    student_name TEXT,
    fee_structure_id TEXT,
    class_name TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    balance DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    invoice_number TEXT NOT NULL,
    due_date DATE,
    notes TEXT,
    branch_id TEXT,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    sponsor_name TEXT,
    sponsor_amount DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS fee_structure_id TEXT;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS sponsor_name TEXT;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS sponsor_amount DECIMAL(12, 2) DEFAULT 0;

-- 4. Ensure ds_payments table exists & has all columns (including edit_reason)
CREATE TABLE IF NOT EXISTS public.ds_payments (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    invoice_id TEXT,
    student_id TEXT,
    student_name TEXT,
    admission_number TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method TEXT DEFAULT 'M-Pesa',
    transaction_reference TEXT,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    receipt_number TEXT,
    received_by TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Completed',
    branch_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    audited_by TEXT,
    audited_at TIMESTAMP WITH TIME ZONE,
    edit_reason TEXT,
    deletion_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS edit_reason TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS audited_by TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS audited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS received_by TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'M-Pesa';
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS transaction_reference TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Completed';
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 5. Clear out partial payments to prevent duplicate key constraint crashes on re-run
TRUNCATE TABLE public.ds_payments CASCADE;

-- 6. Synchronize IDs & create indexes
UPDATE public.ds_students SET id_number = national_id WHERE id_number IS NULL AND national_id IS NOT NULL;
UPDATE public.ds_students SET national_id = id_number WHERE national_id IS NULL AND id_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ds_payments_inst ON public.ds_payments(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_payments_branch ON public.ds_payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_ds_invoices_inst ON public.ds_invoices(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_invoices_branch ON public.ds_invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_ds_students_id_number ON public.ds_students(id_number);

-- 7. PostgREST notification
DO $$ 
BEGIN 
    PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION WHEN OTHERS THEN 
    NULL; 
END $$;

