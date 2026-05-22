-- Migration: 217_add_showroom_invoice_numbering
-- Description: Adds columns to showroom_settings for customizable invoice prefixes, starting numbers, and formatting.

ALTER TABLE showroom_settings 
ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV-CAR-',
ADD COLUMN IF NOT EXISTS invoice_starting_number INTEGER DEFAULT 1001,
ADD COLUMN IF NOT EXISTS invoice_format TEXT DEFAULT '{PREFIX}{NUMBER}';
