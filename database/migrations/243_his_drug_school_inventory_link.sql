-- Migration 243: Link HIS sickbay drugs to school retail inventory items
-- When a nurse dispenses a drug, the school retail inventory quantity is also deducted
-- and the student is billed using the unit_price set on the drug.

-- 1. Add the link column to his_pharmacy_inventory
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'his_pharmacy_inventory'
          AND column_name = 'linked_inventory_item_id'
    ) THEN
        ALTER TABLE public.his_pharmacy_inventory
            ADD COLUMN linked_inventory_item_id TEXT;

        COMMENT ON COLUMN public.his_pharmacy_inventory.linked_inventory_item_id
            IS 'References retail_inventory_items.id. When set, dispensing this drug will also deduct from the school retail inventory.';
    END IF;
END $$;

-- 2. Add a unit_price column for student billing purposes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'his_pharmacy_inventory'
          AND column_name = 'unit_price'
    ) THEN
        ALTER TABLE public.his_pharmacy_inventory
            ADD COLUMN unit_price NUMERIC(12,2) NOT NULL DEFAULT 0;

        COMMENT ON COLUMN public.his_pharmacy_inventory.unit_price
            IS 'Price charged to the student when this drug is dispensed via sickbay.';
    END IF;
END $$;
