-- Migration 203: Add invoice and receipt prefixes to ds_settings
ALTER TABLE ds_settings 
ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV-',
ADD COLUMN IF NOT EXISTS receipt_prefix TEXT DEFAULT 'REC-';
