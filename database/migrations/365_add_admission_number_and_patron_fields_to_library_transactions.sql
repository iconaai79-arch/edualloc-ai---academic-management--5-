-- 365_add_admission_number_and_patron_fields_to_library_transactions.sql
-- Adds admission_number, user_name, student_name, class_level, stream and patron metadata columns to library_transactions table

ALTER TABLE IF EXISTS public.library_transactions
    ADD COLUMN IF NOT EXISTS admission_number TEXT,
    ADD COLUMN IF NOT EXISTS user_name TEXT,
    ADD COLUMN IF NOT EXISTS student_name TEXT,
    ADD COLUMN IF NOT EXISTS borrower_name TEXT,
    ADD COLUMN IF NOT EXISTS recipient_name TEXT,
    ADD COLUMN IF NOT EXISTS class_level TEXT,
    ADD COLUMN IF NOT EXISTS stream TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for fast lookup on admission_number and status
CREATE INDEX IF NOT EXISTS idx_library_transactions_admission_number ON public.library_transactions(admission_number);
CREATE INDEX IF NOT EXISTS idx_library_transactions_status_inst ON public.library_transactions(institution_id, status);
