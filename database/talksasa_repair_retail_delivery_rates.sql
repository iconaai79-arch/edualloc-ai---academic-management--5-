-- ==============================================================================
-- TALKSASA RETAIL LOGISTICS & DELIVERY RATES REPAIR MIGRATION
-- Safely repairs and adds all missing snake_case and camelCase columns to:
--   1. public.retail_delivery_rates
--   2. public.retail_couriers
--   3. public.retail_customers, retail_stock_receipts, retail_stock_transfers,
--      retail_stock_transfer_items, retail_wishlist, retail_commissions_ledger
-- Also unconstrains restrictive foreign keys so SQL dumps import seamlessly.
-- ==============================================================================

-- 1. Ensure retail_couriers exists
CREATE TABLE IF NOT EXISTS public.retail_couriers (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    branch_id TEXT,
    name TEXT,
    company_name TEXT,
    courier_name TEXT,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    contact_person TEXT,
    status TEXT DEFAULT 'Active',
    vehicle_type TEXT,
    pricing_model TEXT,
    base_rate DECIMAL(12, 2) DEFAULT 0,
    per_km_rate DECIMAL(12, 2) DEFAULT 0,
    coverage_areas JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns on retail_couriers exist (both snake_case and camelCase)
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "courierName" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "fullName" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "vehicleType" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS pricing_model TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "pricingModel" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS base_rate DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "baseRate" DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS per_km_rate DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "perKmRate" DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS coverage_areas JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "coverageAreas" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.retail_couriers ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- 2. Ensure retail_delivery_rates exists
CREATE TABLE IF NOT EXISTS public.retail_delivery_rates (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    courier_id TEXT,
    courier_name TEXT,
    destination TEXT,
    rate DECIMAL(12, 2) DEFAULT 0,
    estimated_days INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns on retail_delivery_rates exist (both snake_case and camelCase)
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS courier_id TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "courierId" TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "courierName" TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS destination TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS rate DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS estimated_days INTEGER DEFAULT 1;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "estimatedDays" INTEGER DEFAULT 1;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.retail_delivery_rates ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Drop foreign key and not-null constraints on retail_delivery_rates to avoid import order deadlocks
ALTER TABLE public.retail_delivery_rates ALTER COLUMN institution_id DROP NOT NULL;
ALTER TABLE public.retail_delivery_rates ALTER COLUMN courier_id DROP NOT NULL;
ALTER TABLE public.retail_delivery_rates DROP CONSTRAINT IF EXISTS retail_delivery_rates_courier_id_fkey CASCADE;
ALTER TABLE public.retail_delivery_rates DROP CONSTRAINT IF EXISTS retail_delivery_rates_institution_id_fkey CASCADE;
ALTER TABLE public.retail_delivery_rates DROP CONSTRAINT IF EXISTS fk_retail_delivery_rates_courier CASCADE;
ALTER TABLE public.retail_delivery_rates DROP CONSTRAINT IF EXISTS fk_retail_delivery_rates_institution CASCADE;

-- Drop foreign key constraints dynamically if any remaining
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.retail_delivery_rates'::regclass AND contype = 'f'
    ) LOOP
        EXECUTE 'ALTER TABLE public.retail_delivery_rates DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE;';
    END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Synchronize data between snake_case and camelCase columns
DO $$ BEGIN
    -- Synchronize retail_delivery_rates
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_delivery_rates' AND column_name = 'courierId') THEN
        EXECUTE 'UPDATE public.retail_delivery_rates SET courier_id = "courierId" WHERE (courier_id IS NULL OR courier_id = '''') AND "courierId" IS NOT NULL AND "courierId" != ''''';
        EXECUTE 'UPDATE public.retail_delivery_rates SET "courierId" = courier_id WHERE ("courierId" IS NULL OR "courierId" = '''') AND courier_id IS NOT NULL AND courier_id != ''''';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_delivery_rates' AND column_name = 'courierName') THEN
        EXECUTE 'UPDATE public.retail_delivery_rates SET courier_name = "courierName" WHERE (courier_name IS NULL OR courier_name = '''') AND "courierName" IS NOT NULL AND "courierName" != ''''';
        EXECUTE 'UPDATE public.retail_delivery_rates SET "courierName" = courier_name WHERE ("courierName" IS NULL OR "courierName" = '''') AND courier_name IS NOT NULL AND courier_name != ''''';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_delivery_rates' AND column_name = 'institutionId') THEN
        EXECUTE 'UPDATE public.retail_delivery_rates SET institution_id = "institutionId" WHERE (institution_id IS NULL OR institution_id = '''') AND "institutionId" IS NOT NULL AND "institutionId" != ''''';
        EXECUTE 'UPDATE public.retail_delivery_rates SET "institutionId" = institution_id WHERE ("institutionId" IS NULL OR "institutionId" = '''') AND institution_id IS NOT NULL AND institution_id != ''''';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_delivery_rates' AND column_name = 'estimatedDays') THEN
        EXECUTE 'UPDATE public.retail_delivery_rates SET estimated_days = ("estimatedDays"::text)::integer WHERE (estimated_days IS NULL OR estimated_days = 0) AND "estimatedDays" IS NOT NULL';
        EXECUTE 'UPDATE public.retail_delivery_rates SET "estimatedDays" = estimated_days WHERE ("estimatedDays" IS NULL OR "estimatedDays" = 0) AND estimated_days IS NOT NULL';
    END IF;

    -- Synchronize retail_couriers
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_couriers' AND column_name = 'institutionId') THEN
        EXECUTE 'UPDATE public.retail_couriers SET institution_id = "institutionId" WHERE (institution_id IS NULL OR institution_id = '''') AND "institutionId" IS NOT NULL AND "institutionId" != ''''';
        EXECUTE 'UPDATE public.retail_couriers SET "institutionId" = institution_id WHERE ("institutionId" IS NULL OR "institutionId" = '''') AND institution_id IS NOT NULL AND institution_id != ''''';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_couriers' AND column_name = 'companyName') THEN
        EXECUTE 'UPDATE public.retail_couriers SET company_name = "companyName" WHERE (company_name IS NULL OR company_name = '''') AND "companyName" IS NOT NULL AND "companyName" != ''''';
        EXECUTE 'UPDATE public.retail_couriers SET "companyName" = company_name WHERE ("companyName" IS NULL OR "companyName" = '''') AND company_name IS NOT NULL AND company_name != ''''';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_couriers' AND column_name = 'courierName') THEN
        EXECUTE 'UPDATE public.retail_couriers SET courier_name = "courierName" WHERE (courier_name IS NULL OR courier_name = '''') AND "courierName" IS NOT NULL AND "courierName" != ''''';
        EXECUTE 'UPDATE public.retail_couriers SET "courierName" = courier_name WHERE ("courierName" IS NULL OR "courierName" = '''') AND courier_name IS NOT NULL AND courier_name != ''''';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'retail_couriers' AND column_name = 'phoneNumber') THEN
        EXECUTE 'UPDATE public.retail_couriers SET phone = "phoneNumber" WHERE (phone IS NULL OR phone = '''') AND "phoneNumber" IS NOT NULL AND "phoneNumber" != ''''';
        EXECUTE 'UPDATE public.retail_couriers SET "phoneNumber" = phone WHERE ("phoneNumber" IS NULL OR "phoneNumber" = '''') AND phone IS NOT NULL AND phone != ''''';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Companion retail tables resilience (customers, stock receipts, transfers, wishlist, ledger)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_customers') THEN
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS name TEXT;
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS phone_number TEXT;
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS loyalty_points NUMERIC DEFAULT 0;
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS "loyaltyPoints" NUMERIC DEFAULT 0;
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12, 2) DEFAULT 0;
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS "totalSpent" TEXT;
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.retail_customers ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_stock_receipts') THEN
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS supplier_id TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS supplier_name TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS "supplierName" TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS reference_number TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS receipt_date TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS "receiptDate" TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) DEFAULT 0;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS "totalAmount" TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS recorded_by TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS "recordedBy" TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Completed';
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.retail_stock_receipts ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_stock_transfers') THEN
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS source_store_id TEXT;
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS "sourceStoreId" TEXT;
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS destination_store_id TEXT;
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS "destinationStoreId" TEXT;
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS requested_by_id TEXT;
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS "requestedById" TEXT;
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS approved_by_id TEXT;
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Completed';
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
        ALTER TABLE public.retail_stock_transfers ADD COLUMN IF NOT EXISTS "completedAt" TEXT;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_stock_transfer_items') THEN
        ALTER TABLE public.retail_stock_transfer_items ADD COLUMN IF NOT EXISTS transfer_id TEXT;
        ALTER TABLE public.retail_stock_transfer_items ADD COLUMN IF NOT EXISTS "transferId" TEXT;
        ALTER TABLE public.retail_stock_transfer_items ADD COLUMN IF NOT EXISTS item_id TEXT;
        ALTER TABLE public.retail_stock_transfer_items ADD COLUMN IF NOT EXISTS "itemId" TEXT;
        ALTER TABLE public.retail_stock_transfer_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
        ALTER TABLE public.retail_stock_transfer_items ADD COLUMN IF NOT EXISTS serial_numbers TEXT;
        ALTER TABLE public.retail_stock_transfer_items ADD COLUMN IF NOT EXISTS "serialNumbers" TEXT;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_wishlist') THEN
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS customer_name TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS "customerName" TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS phone_number TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS product_query TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS "productQuery" TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS max_budget TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS "maxBudget" TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS urgency TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS captured_by_id TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS "capturedById" TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS is_matched BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS "isMatched" BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS notified_at TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS "notifiedAt" TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
        ALTER TABLE public.retail_wishlist ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Open';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_commissions_ledger') THEN
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS agent_id TEXT;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS "agentId" TEXT;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS sale_id TEXT;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS "saleId" TEXT;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS item_id TEXT;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS "itemId" TEXT;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS serial_number TEXT;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS base_price DECIMAL(12, 2) DEFAULT 0;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS "basePrice" TEXT;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS sold_price DECIMAL(12, 2) DEFAULT 0;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS "soldPrice" TEXT;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(12, 2) DEFAULT 0;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS "commissionAmount" TEXT;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.retail_commissions_ledger ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
