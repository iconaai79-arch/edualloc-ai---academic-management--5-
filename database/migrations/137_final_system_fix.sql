-- 137. FINAL SYSTEM-WIDE FIX FOR PHARMACY & SMS RECONCILIATION
-- Purpose: Resolve Inventory operation failures and ensure SMS pool reflects correctly.

-- 1. UPGRADE SMS BALANCE RPC (Support for 'SYSTEM' global pool)
CREATE OR REPLACE FUNCTION public.increment_sms_balance(inst_id TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
    IF inst_id = 'SYSTEM' THEN
        -- Safely update system_settings JSONB data
        UPDATE system_settings
        SET data = jsonb_set(
            COALESCE(data, '{}'::jsonb), 
            '{sms_balance}', 
            (COALESCE((data->>'sms_balance')::int, 0) + amount)::text::jsonb
        )
        WHERE id = 1;
        
        -- Also update company_details if it exists for redundant visibility
        UPDATE company_details 
        SET sms_balance = COALESCE(sms_balance, 0) + amount;
    ELSE
        UPDATE institutions
        SET sms_balance = COALESCE(sms_balance, 0) + amount
        WHERE id = inst_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.decrement_sms_balance(inst_id TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
    IF inst_id = 'SYSTEM' THEN
        UPDATE system_settings
        SET data = jsonb_set(
            COALESCE(data, '{}'::jsonb), 
            '{sms_balance}', 
            (GREATEST(0, COALESCE((data->>'sms_balance')::int, 0) - amount))::text::jsonb
        )
        WHERE id = 1;
        
        UPDATE company_details 
        SET sms_balance = GREATEST(0, COALESCE(sms_balance, 0) - amount);
    ELSE
        UPDATE institutions
        SET sms_balance = GREATEST(0, COALESCE(sms_balance, 0) - amount)
        WHERE id = inst_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. RESOLVE PHARMACY INVENTORY & SCHEMA FAILURES
-- Ensure recorded_by and other required clinical fields exist across all nodes

-- Patients
ALTER TABLE his_patients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE his_patients ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE his_patients ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Inventory & Batches
ALTER TABLE his_pharmacy_inventory ADD COLUMN IF NOT EXISTS is_narcotic BOOLEAN DEFAULT FALSE;
ALTER TABLE his_pharmacy_inventory ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE his_pharmacy_inventory ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE his_pharmacy_batches ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Sales & Ledger
ALTER TABLE his_pharmacy_sales ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_pharmacy_ledger ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_pharmacy_ledger ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Staff & Clinical
ALTER TABLE his_pharmacy_staff ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_prescriptions ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
ALTER TABLE his_prescriptions ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_pharmacy_settings ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- 3. NCBA TRANSACTION VISIBILITY REINFORCEMENT
CREATE TABLE IF NOT EXISTS ncba_transactions (
    id TEXT PRIMARY KEY,
    transaction_id TEXT UNIQUE NOT NULL,
    institution_id TEXT NOT NULL, -- Removed foreign key to allow 'SYSTEM' ID
    amount NUMERIC(15, 2) NOT NULL,
    phone_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Drop foreign key if it exists to allow 'SYSTEM' as a valid institution_id
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'ncba_transactions_institution_id_fkey' 
               AND table_name = 'ncba_transactions') THEN
        ALTER TABLE ncba_transactions DROP CONSTRAINT ncba_transactions_institution_id_fkey;
    END IF;
END $$;

ALTER TABLE ncba_transactions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'ncba';
ALTER TABLE ncba_transactions ADD COLUMN IF NOT EXISTS payer_name TEXT;
ALTER TABLE ncba_transactions ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
ALTER TABLE ncba_transactions ADD COLUMN IF NOT EXISTS external_data JSONB DEFAULT '{}';
ALTER TABLE ncba_transactions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ncba_transactions ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- 4. GRANTS
GRANT EXECUTE ON FUNCTION public.increment_sms_balance(TEXT, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_sms_balance(TEXT, INTEGER) TO anon, authenticated, service_role;
