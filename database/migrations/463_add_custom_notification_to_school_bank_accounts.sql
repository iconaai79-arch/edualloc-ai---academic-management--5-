-- Migration: Add custom notification template and instructions to school_bank_accounts
-- Path: database/migrations/463_add_custom_notification_to_school_bank_accounts.sql

ALTER TABLE public.school_bank_accounts ADD COLUMN IF NOT EXISTS payment_notification_template TEXT;
ALTER TABLE public.school_bank_accounts ADD COLUMN IF NOT EXISTS payment_instructions TEXT;
ALTER TABLE public.school_bank_accounts ADD COLUMN IF NOT EXISTS enable_custom_notification BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.school_bank_accounts.payment_notification_template IS 'Custom SMS/WhatsApp receipt notification template for payments credited to this account';
COMMENT ON COLUMN public.school_bank_accounts.payment_instructions IS 'Specific payment instructions, bank deposit details, paybill and contact info for this account';
COMMENT ON COLUMN public.school_bank_accounts.enable_custom_notification IS 'Flag indicating whether custom payment notification is enabled for this account';
