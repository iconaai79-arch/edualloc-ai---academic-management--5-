-- Migration: 369_auto_update_inventory_on_stock_receipt_and_issue.sql
-- Description: Automatically updates retail_inventory_items quantities upon stock receipt and stock issue events.

-- 1. Function to increment or auto-create inventory items on stock receipt
CREATE OR REPLACE FUNCTION public.auto_update_inventory_on_stock_receipt()
RETURNS TRIGGER AS $$
DECLARE
    receipt_item JSONB;
    v_item_id    TEXT;
    v_item_name  TEXT;
    v_sku        TEXT;
    v_qty        INTEGER;
    v_cost       NUMERIC(10, 2);
    v_found_id   TEXT;
BEGIN
    IF NEW.items IS NULL OR jsonb_typeof(NEW.items) <> 'array' THEN
        RETURN NEW;
    END IF;

    FOR receipt_item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
        v_item_id   := receipt_item->>'itemId';
        v_item_name := TRIM(COALESCE(receipt_item->>'itemName', ''));
        v_sku       := TRIM(COALESCE(receipt_item->>'sku', ''));
        v_qty       := COALESCE((receipt_item->>'quantity')::INTEGER, 0);
        v_cost      := COALESCE((receipt_item->>'unitCost')::NUMERIC, 0);

        IF v_qty > 0 THEN
            v_found_id := NULL;

            -- Try to locate existing inventory item by ID, SKU, or Name in the same institution
            SELECT id INTO v_found_id
            FROM public.retail_inventory_items
            WHERE institution_id::TEXT = NEW.institution_id::TEXT
              AND (
                  (v_item_id IS NOT NULL AND id::TEXT = v_item_id)
                  OR (v_sku <> '' AND sku IS NOT NULL AND LOWER(sku) = LOWER(v_sku))
                  OR (v_item_name <> '' AND LOWER(name) = LOWER(v_item_name))
              )
            LIMIT 1;

            IF v_found_id IS NOT NULL THEN
                -- Increment existing inventory
                UPDATE public.retail_inventory_items
                SET quantity = quantity + v_qty,
                    cost_price = CASE WHEN v_cost > 0 THEN v_cost ELSE cost_price END,
                    last_updated = NOW()
                WHERE id = v_found_id;
            ELSE
                -- Auto-create new inventory item so it is immediately stocked and accessible
                INSERT INTO public.retail_inventory_items (
                    id,
                    institution_id,
                    name,
                    sku,
                    category,
                    quantity,
                    unit,
                    cost_price,
                    base_price,
                    srp_price,
                    reorder_level,
                    marketplace_enabled,
                    created_at,
                    last_updated
                ) VALUES (
                    COALESCE(v_item_id, 'inv_' || encode(gen_random_bytes(6), 'hex')),
                    NEW.institution_id,
                    CASE WHEN v_item_name <> '' THEN v_item_name ELSE 'Stocked Item' END,
                    CASE WHEN v_sku <> '' THEN v_sku ELSE 'SKU-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') END,
                    'Stationery',
                    v_qty,
                    'pcs',
                    v_cost,
                    v_cost,
                    v_cost,
                    5,
                    TRUE,
                    NOW(),
                    NOW()
                );
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop and recreate trigger on retail_stock_receipts
DROP TRIGGER IF EXISTS trg_auto_update_inventory_on_stock_receipt ON public.retail_stock_receipts;
CREATE TRIGGER trg_auto_update_inventory_on_stock_receipt
AFTER INSERT ON public.retail_stock_receipts
FOR EACH ROW
EXECUTE FUNCTION public.auto_update_inventory_on_stock_receipt();


-- 2. Function to deduct inventory items on stock issue
CREATE OR REPLACE FUNCTION public.auto_update_inventory_on_stock_issue()
RETURNS TRIGGER AS $$
DECLARE
    issue_item  JSONB;
    v_item_id   TEXT;
    v_item_name TEXT;
    v_sku       TEXT;
    v_qty       INTEGER;
    v_found_id  TEXT;
BEGIN
    IF NEW.items IS NULL OR jsonb_typeof(NEW.items) <> 'array' THEN
        RETURN NEW;
    END IF;

    FOR issue_item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
        v_item_id   := issue_item->>'itemId';
        v_item_name := TRIM(COALESCE(issue_item->>'itemName', ''));
        v_sku       := TRIM(COALESCE(issue_item->>'sku', ''));
        v_qty       := COALESCE((issue_item->>'quantity')::INTEGER, 0);

        IF v_qty > 0 THEN
            v_found_id := NULL;

            -- Try to find item by ID, SKU, or Name
            SELECT id INTO v_found_id
            FROM public.retail_inventory_items
            WHERE institution_id::TEXT = NEW.institution_id::TEXT
              AND (
                  (v_item_id IS NOT NULL AND id::TEXT = v_item_id)
                  OR (v_sku <> '' AND sku IS NOT NULL AND LOWER(sku) = LOWER(v_sku))
                  OR (v_item_name <> '' AND LOWER(name) = LOWER(v_item_name))
              )
            LIMIT 1;

            IF v_found_id IS NOT NULL THEN
                UPDATE public.retail_inventory_items
                SET quantity = GREATEST(0, quantity - v_qty),
                    last_updated = NOW()
                WHERE id = v_found_id;
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop and recreate trigger on retail_stock_issues
DROP TRIGGER IF EXISTS trg_auto_update_inventory_on_stock_issue ON public.retail_stock_issues;
CREATE TRIGGER trg_auto_update_inventory_on_stock_issue
AFTER INSERT ON public.retail_stock_issues
FOR EACH ROW
EXECUTE FUNCTION public.auto_update_inventory_on_stock_issue();

-- Reload schema
NOTIFY pgrst, 'reload schema';
