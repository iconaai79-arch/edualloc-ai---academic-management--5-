-- Migration 206: Add status to ds_payments
ALTER TABLE ds_payments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Completed';
