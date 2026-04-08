-- 138. CONVERT UUID COLUMNS TO TEXT
-- Purpose: Resolve "invalid input syntax for type uuid" errors by standardizing HIS tables to use TEXT IDs
-- matching the application's code-level ID generation patterns (e.g., "inv_...", "stf_...").

DO $$ 
DECLARE
    row RECORD;
BEGIN
    -- 1. Identify all HIS/PHARMACY tables that might have been created with UUID types
    FOR row IN 
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'his_patients', 'his_staff', 'his_pharmacy_inventory', 
            'his_pharmacy_sales', 'his_pharmacy_sale_items', 'his_pharmacy_batches',
            'his_pharmacy_ledger', 'his_pharmacy_staff', 'his_pharmacy_adherence_alerts',
            'his_pharmacy_settings', 'his_prescriptions', 'his_prescription_items',
            'ncba_transactions'
        )
        AND data_type = 'uuid'
    LOOP
        -- 2. Drop constraints temporarily if they are foreign keys to allow type change
        -- (This is a simplified approach; if there are complex dependencies, it might require more logic)
        -- But for these tables, we usually have standard fk names.
        
        -- 3. Perform the conversion
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE TEXT USING %I::text', row.table_name, row.column_name, row.column_name);
        
        RAISE NOTICE 'Converted %.% from UUID to TEXT', row.table_name, row.column_name;
    END LOOP;
END $$;

-- 4. Specifically ensure ncba_transactions institution_id is TEXT
ALTER TABLE ncba_transactions ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;

-- 5. Fix default value for his_pharmacy_inventory if it was uuid_generate_v4()
ALTER TABLE his_pharmacy_inventory ALTER COLUMN id DROP DEFAULT;
ALTER TABLE his_patients ALTER COLUMN id DROP DEFAULT;
ALTER TABLE his_prescriptions ALTER COLUMN id DROP DEFAULT;

-- 6. Ensure standard primary keys are TEXT
ALTER TABLE his_pharmacy_inventory ALTER COLUMN id SET DATA TYPE TEXT;
ALTER TABLE his_patients ALTER COLUMN id SET DATA TYPE TEXT;
ALTER TABLE his_prescriptions ALTER COLUMN id SET DATA TYPE TEXT;
