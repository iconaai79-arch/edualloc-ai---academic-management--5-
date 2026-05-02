-- Migration 197: Relax Pharmacy Inventory FK Constraints
-- Drops restrictive foreign keys for `recorded_by` and `institution_id` 
-- to allow seamless posting even if the current user (e.g. temp_admin) 
-- or institution references do not precisely match the underlying tables.

DO $$ 
BEGIN
    -- Relax his_pharmacy_inventory
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'his_pharmacy_inventory_recorded_by_fkey' AND table_name = 'his_pharmacy_inventory') THEN
        ALTER TABLE public.his_pharmacy_inventory DROP CONSTRAINT his_pharmacy_inventory_recorded_by_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'his_pharmacy_inventory_institution_id_fkey' AND table_name = 'his_pharmacy_inventory') THEN
        ALTER TABLE public.his_pharmacy_inventory DROP CONSTRAINT his_pharmacy_inventory_institution_id_fkey;
    END IF;

    -- Relax his_pharmacy_batches
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'his_pharmacy_batches_recorded_by_fkey' AND table_name = 'his_pharmacy_batches') THEN
        ALTER TABLE public.his_pharmacy_batches DROP CONSTRAINT his_pharmacy_batches_recorded_by_fkey;
    END IF;

    -- Relax his_prescriptions
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'his_prescriptions_recorded_by_fkey' AND table_name = 'his_prescriptions') THEN
        ALTER TABLE public.his_prescriptions DROP CONSTRAINT his_prescriptions_recorded_by_fkey;
    END IF;
END $$;
