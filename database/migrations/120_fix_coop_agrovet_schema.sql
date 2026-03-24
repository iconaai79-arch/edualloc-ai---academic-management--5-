-- Migration: Fix Coop Agrovet Schema Mismatches
-- Description: Renames columns and adds missing columns to coop_agrovet_inventory and coop_agrovet_sales to match frontend UI payloads.

-- 1. Fix coop_agrovet_inventory
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coop_agrovet_inventory' AND column_name='name') THEN
        ALTER TABLE coop_agrovet_inventory RENAME COLUMN "name" TO "item_name";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coop_agrovet_inventory' AND column_name='stock_quantity') THEN
        ALTER TABLE coop_agrovet_inventory RENAME COLUMN "stock_quantity" TO "quantity";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coop_agrovet_inventory' AND column_name='price') THEN
        ALTER TABLE coop_agrovet_inventory RENAME COLUMN "price" TO "unit_price";
    END IF;
END $$;
ALTER TABLE coop_agrovet_inventory ADD COLUMN IF NOT EXISTS "reorder_level" INTEGER DEFAULT 10;
ALTER TABLE coop_agrovet_inventory ADD COLUMN IF NOT EXISTS "supplier" TEXT;

-- 2. Fix coop_agrovet_sales
ALTER TABLE coop_agrovet_sales ADD COLUMN IF NOT EXISTS "item_id" TEXT REFERENCES coop_agrovet_inventory(id) ON DELETE SET NULL;
ALTER TABLE coop_agrovet_sales ADD COLUMN IF NOT EXISTS "quantity" INTEGER DEFAULT 1;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coop_agrovet_sales' AND column_name='total_amount') THEN
        ALTER TABLE coop_agrovet_sales RENAME COLUMN "total_amount" TO "amount";
    END IF;
    -- Since payment_method has a CHECK constraint, we might need to recreate it if renaming or changing values
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coop_agrovet_sales' AND column_name='payment_method') THEN
        ALTER TABLE coop_agrovet_sales RENAME COLUMN "payment_method" TO "payment_status";
    END IF;
END $$;

-- Update the CHECK constraint for payment_status
ALTER TABLE coop_agrovet_sales DROP CONSTRAINT IF EXISTS coop_agrovet_sales_payment_method_check;
ALTER TABLE coop_agrovet_sales DROP CONSTRAINT IF EXISTS coop_agrovet_sales_payment_status_check;
ALTER TABLE coop_agrovet_sales ADD CONSTRAINT coop_agrovet_sales_payment_status_check CHECK (payment_status IN ('cash', 'credit_deduction', 'paid', 'credit', 'deducted'));

CREATE INDEX IF NOT EXISTS idx_coop_agrovet_sales_item ON coop_agrovet_sales(item_id);
CREATE INDEX IF NOT EXISTS idx_coop_agrovet_sales_date ON coop_agrovet_sales(sale_date);

-- 3. Fix coop_collections constraints
ALTER TABLE coop_collections DROP CONSTRAINT IF EXISTS coop_collections_product_type_check;
ALTER TABLE coop_collections ADD CONSTRAINT coop_collections_product_type_check CHECK (LOWER(product_type) IN ('milk', 'tea', 'coffee', 'produce', 'pyrethrum', 'other'));

-- 4. Fix coop_monthly_payouts status check
ALTER TABLE coop_monthly_payouts DROP CONSTRAINT IF EXISTS coop_monthly_payouts_status_check;
ALTER TABLE coop_monthly_payouts ADD CONSTRAINT coop_monthly_payouts_status_check CHECK (status IN ('pending', 'initiated', 'approved', 'paid', 'cancelled'));
