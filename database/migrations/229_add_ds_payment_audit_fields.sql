-- Migration 229: Add audited_by and audited_at to ds_payments
ALTER TABLE ds_payments 
ADD COLUMN IF NOT EXISTS audited_by TEXT,
ADD COLUMN IF NOT EXISTS audited_at TIMESTAMP WITH TIME ZONE;
