-- Migration: 087_retail_stock_reduction_trigger
-- Description: Adds a trigger to automatically reduce retail_inventory_items.quantity
--              whenever a new sale is recorded in retail_sales.
--              The retail_sales.items column is JSONB containing an array of
--              { "itemId": "...", "quantity": N, ... } objects.

-- 1. Trigger Function: iterates over each item in the sale's JSONB array
CREATE OR REPLACE FUNCTION reduce_retail_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    sale_item JSONB;
    item_id   TEXT;
    qty       INTEGER;
BEGIN
    -- Loop through each item in the JSONB array
    FOR sale_item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
        item_id := sale_item->>'itemId';
        qty     := (sale_item->>'quantity')::INTEGER;

        IF item_id IS NOT NULL AND qty > 0 THEN
            UPDATE public.retail_inventory_items
            SET quantity = GREATEST(0, quantity - qty),
                last_updated = NOW()
            WHERE id::TEXT = item_id;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Drop existing trigger if it exists, then recreate
DROP TRIGGER IF EXISTS trg_reduce_retail_stock ON public.retail_sales;

CREATE TRIGGER trg_reduce_retail_stock
AFTER INSERT ON public.retail_sales
FOR EACH ROW
EXECUTE FUNCTION reduce_retail_stock_on_sale();
