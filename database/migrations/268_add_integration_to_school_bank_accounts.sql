-- Path: database/migrations/268_add_integration_to_school_bank_accounts.sql
-- Migration: Add Integration Service and Status columns to school bank accounts

ALTER TABLE public.school_bank_accounts ADD COLUMN IF NOT EXISTS integration_service TEXT DEFAULT 'None';
ALTER TABLE public.school_bank_accounts ADD COLUMN IF NOT EXISTS integration_status TEXT DEFAULT 'Not Configured';
