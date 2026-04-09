-- Migration: Farmer Bank Details
-- Description: Adds bank specific columns to coop_farmers table.

ALTER TABLE coop_farmers ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE coop_farmers ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
