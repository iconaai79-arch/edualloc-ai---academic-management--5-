-- Migration: 252_add_pm_settings_numbering_column
-- Description: Adds the missing 'numbering' JSONB column and 'default_rent_due_date'
--              integer column to pm_settings. These fields are used by PMConfigManager
--              to configure document numbering (invoice/receipt/lease prefixes and
--              starting sequence numbers). Without this column the settings were
--              silently discarded on every save.

-- Add numbering column if it doesn't exist
ALTER TABLE pm_settings
    ADD COLUMN IF NOT EXISTS numbering JSONB DEFAULT '{
        "invoicePrefix": "INV",
        "invoiceNextNumber": 1000,
        "receiptPrefix": "REC",
        "receiptNextNumber": 1000,
        "leasePrefix": "LSE",
        "leaseNextNumber": 1000
    }'::jsonb;

-- Add default_rent_due_date column if it doesn't exist
ALTER TABLE pm_settings
    ADD COLUMN IF NOT EXISTS default_rent_due_date INTEGER DEFAULT 5;

-- Backfill: set default numbering for any existing rows that have null
UPDATE pm_settings
SET numbering = '{
    "invoicePrefix": "INV",
    "invoiceNextNumber": 1000,
    "receiptPrefix": "REC",
    "receiptNextNumber": 1000,
    "leasePrefix": "LSE",
    "leaseNextNumber": 1000
}'::jsonb
WHERE numbering IS NULL;

-- Backfill: set default due date for existing rows
UPDATE pm_settings
SET default_rent_due_date = 5
WHERE default_rent_due_date IS NULL;
