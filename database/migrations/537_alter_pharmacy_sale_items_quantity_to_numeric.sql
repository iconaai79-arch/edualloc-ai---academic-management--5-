-- Migration 537: Alter his_pharmacy_sale_items.quantity to NUMERIC(12, 2)
-- Resolves: ERROR: invalid input syntax for type integer: "1.00"

DO $$
BEGIN
    -- 1. Ensure table his_pharmacy_sale_items exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'his_pharmacy_sale_items'
    ) THEN
        -- 2. Alter column quantity from INTEGER to NUMERIC(12, 2)
        BEGIN
            ALTER TABLE public.his_pharmacy_sale_items ALTER COLUMN quantity DROP DEFAULT;
            ALTER TABLE public.his_pharmacy_sale_items ALTER COLUMN quantity TYPE NUMERIC(12, 2) USING quantity::numeric;
            ALTER TABLE public.his_pharmacy_sale_items ALTER COLUMN quantity SET DEFAULT 1;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- 3. Ensure camelCase / snake_case compatibility columns exist for imports & backups
        ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "saleId" TEXT;
        ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "medicationId" TEXT;
        ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "batchId" TEXT;
        ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "unitPrice" NUMERIC(10, 2);
        ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "totalPrice" NUMERIC(10, 2);
        ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "recordedBy" TEXT;
        ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

        -- 4. Backfill values if camelCase columns are populated and snake_case are empty, or vice-versa
        BEGIN
            UPDATE public.his_pharmacy_sale_items
            SET 
                sale_id = COALESCE(sale_id, "saleId"),
                "saleId" = COALESCE("saleId", sale_id),
                medication_id = COALESCE(medication_id, "medicationId"),
                "medicationId" = COALESCE("medicationId", medication_id),
                batch_id = COALESCE(batch_id, "batchId"),
                "batchId" = COALESCE("batchId", batch_id),
                unit_price = COALESCE(unit_price, "unitPrice"),
                "unitPrice" = COALESCE("unitPrice", unit_price),
                total_price = COALESCE(total_price, "totalPrice"),
                "totalPrice" = COALESCE("totalPrice", total_price),
                recorded_by = COALESCE(recorded_by, "recordedBy"),
                "recordedBy" = COALESCE("recordedBy", recorded_by),
                institution_id = COALESCE(institution_id, "institutionId"),
                "institutionId" = COALESCE("institutionId", institution_id);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;
