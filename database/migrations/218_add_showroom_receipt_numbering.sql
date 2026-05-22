-- Migration: 218_add_showroom_receipt_numbering
-- Description: Adds columns to showroom_settings for customizable receipt prefixes, starting numbers, and formatting.

ALTER TABLE showroom_settings 
ADD COLUMN IF NOT EXISTS receipt_prefix TEXT DEFAULT 'REC-CAR-',
ADD COLUMN IF NOT EXISTS receipt_starting_number INTEGER DEFAULT 1001,
ADD COLUMN IF NOT EXISTS receipt_format TEXT DEFAULT '{PREFIX}{NUMBER}';
