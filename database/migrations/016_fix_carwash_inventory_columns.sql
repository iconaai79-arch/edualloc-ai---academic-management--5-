-- Migration: Add missing columns to carwash_inventory
ALTER TABLE carwash_inventory ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE carwash_inventory ADD COLUMN IF NOT EXISTS supplier_id TEXT REFERENCES institutions(id) ON DELETE SET NULL;
ALTER TABLE carwash_inventory ADD COLUMN IF NOT EXISTS last_restocked_at TIMESTAMP WITH TIME ZONE;
