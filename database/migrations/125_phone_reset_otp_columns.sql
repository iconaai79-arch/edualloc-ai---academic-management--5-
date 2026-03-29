-- [125] Add Phone-Based Reset OTP Columns to Users Table
-- This migration adds the necessary columns to track recovery OTPs and their expiration.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reset_otp TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reset_otp_expires TIMESTAMPTZ;

-- Ensure standard Supabase roles can access these columns (RLS still applies)
GRANT ALL ON TABLE public.users TO authenticated, service_role;
