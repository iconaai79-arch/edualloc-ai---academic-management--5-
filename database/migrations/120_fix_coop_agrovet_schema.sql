-- Migration: Fix Coop Agrovet Schema Mismatches
-- Description: Renames columns and adds missing columns to coop_agrovet_inventory and coop_agrovet_sales to match frontend UI payloads.

-- 1. Fix coop_agrovet_inventory
ALTER TABLE coop_agrovet_inventory RENAME COLUMN "name" TO "item_name";
ALTER TABLE coop_agrovet_inventory RENAME COLUMN "stock_quantity" TO "quantity";
ALTER TABLE coop_agrovet_inventory RENAME COLUMN "price" TO "unit_price";
ALTER TABLE coop_agrovet_inventory ADD COLUMN IF NOT EXISTS "reorder_level" INTEGER DEFAULT 10;
ALTER TABLE coop_agrovet_inventory ADD COLUMN IF NOT EXISTS "supplier" TEXT;

-- 2. Fix coop_agrovet_sales
ALTER TABLE coop_agrovet_sales ADD COLUMN IF NOT EXISTS "item_id" TEXT REFERENCES coop_agrovet_inventory(id) ON DELETE SET NULL;
ALTER TABLE coop_agrovet_sales ADD COLUMN IF NOT EXISTS "quantity" INTEGER DEFAULT 1;
ALTER TABLE coop_agrovet_sales RENAME COLUMN "total_amount" TO "amount";
-- Since payment_method has a CHECK constraint, we might need to recreate it if renaming or changing values
ALTER TABLE coop_agrovet_sales RENAME COLUMN "payment_method" TO "payment_status";

-- Update the CHECK constraint for payment_status
ALTER TABLE coop_agrovet_sales DROP CONSTRAINT IF EXISTS coop_agrovet_sales_payment_method_check;
ALTER TABLE coop_agrovet_sales ADD CONSTRAINT coop_agrovet_sales_payment_status_check CHECK (payment_status IN ('cash', 'credit_deduction', 'paid', 'credit', 'deducted'));
