-- ==============================================================================
-- Migration: 338_ensure_grain_miller_and_processing_schema.sql
-- Description: Complete Maize Milling & Grain Processing System Database Schema
-- Tables:
--   1. weighbridge_intake_tickets (Grain Intake & Quality Testing)
--   2. grain_suppliers (Aggregators, Cooperatives, Traders & Farmers)
--   3. milling_silos (Grain Storage Silos, Bunkers & Warehouses)
--   4. milling_batch_runs (Milling Operations, Yields, Extraction & Byproducts)
--   5. flour_packaging_shifts (Flour Bagging, Baling & Piece-rate Labor)
--   6. animal_feed_batches (Bran, Germ & Pollard Formulations)
--   7. grain_sale_orders (Wholesale, Supermarket & Distribution Invoices)
-- ==============================================================================

-- 1. Table: weighbridge_intake_tickets
CREATE TABLE IF NOT EXISTS public.weighbridge_intake_tickets (
    id TEXT PRIMARY KEY,
    ticket_number TEXT,
    "ticketNumber" TEXT,
    institution_id TEXT,
    "institutionId" TEXT,
    
    -- Supplier & Hauler details
    supplier_id TEXT,
    "supplierId" TEXT,
    supplier_name TEXT,
    "supplierName" TEXT,
    supplier_phone TEXT,
    "supplierPhone" TEXT,
    supplier_type TEXT DEFAULT 'Farmer',
    "supplierType" TEXT DEFAULT 'Farmer',
    truck_registration TEXT,
    "truckRegistration" TEXT,
    driver_name TEXT,
    "driverName" TEXT,
    driver_phone TEXT,
    "driverPhone" TEXT,
    
    -- Grain specifications & QA
    grain_type TEXT DEFAULT 'White Maize',
    "grainType" TEXT DEFAULT 'White Maize',
    grade TEXT DEFAULT 'Grade 1',
    gross_weight_kg NUMERIC(12,2) DEFAULT 0,
    "grossWeightKg" NUMERIC(12,2) DEFAULT 0,
    tare_weight_kg NUMERIC(12,2) DEFAULT 0,
    "tareWeightKg" NUMERIC(12,2) DEFAULT 0,
    bag_count INTEGER DEFAULT 0,
    "bagCount" INTEGER DEFAULT 0,
    bag_tare_kg NUMERIC(10,2) DEFAULT 0.15,
    "bagTareKg" NUMERIC(10,2) DEFAULT 0.15,
    moisture_content_pct NUMERIC(6,2) DEFAULT 13.5,
    "moistureContentPct" NUMERIC(6,2) DEFAULT 13.5,
    moisture_shrinkage_kg NUMERIC(10,2) DEFAULT 0,
    "moistureShrinkageKg" NUMERIC(10,2) DEFAULT 0,
    foreign_matter_pct NUMERIC(6,2) DEFAULT 0,
    "foreignMatterPct" NUMERIC(6,2) DEFAULT 0,
    aflatoxin_ppb NUMERIC(8,2) DEFAULT 0,
    "aflatoxinPpb" NUMERIC(8,2) DEFAULT 0,
    net_weight_kg NUMERIC(12,2) DEFAULT 0,
    "netWeightKg" NUMERIC(12,2) DEFAULT 0,
    
    -- Financial deductions & payout
    buying_price_per_kg NUMERIC(10,2) DEFAULT 0,
    "buyingPricePerKg" NUMERIC(10,2) DEFAULT 0,
    total_amount_gross NUMERIC(12,2) DEFAULT 0,
    "totalAmountGross" NUMERIC(12,2) DEFAULT 0,
    offloading_fee NUMERIC(10,2) DEFAULT 0,
    "offloadingFee" NUMERIC(10,2) DEFAULT 0,
    bag_fee NUMERIC(10,2) DEFAULT 0,
    "bagFee" NUMERIC(10,2) DEFAULT 0,
    loan_deduction NUMERIC(12,2) DEFAULT 0,
    "loanDeduction" NUMERIC(12,2) DEFAULT 0,
    net_payable_amount NUMERIC(12,2) DEFAULT 0,
    "netPayableAmount" NUMERIC(12,2) DEFAULT 0,
    
    -- Destination & Workflow
    target_silo_id TEXT,
    "targetSiloId" TEXT,
    status TEXT DEFAULT 'Approved',
    payment_status TEXT DEFAULT 'Pending',
    "paymentStatus" TEXT DEFAULT 'Pending',
    payment_method TEXT DEFAULT 'M-Pesa B2C',
    "paymentMethod" TEXT DEFAULT 'M-Pesa B2C',
    payment_reference TEXT,
    "paymentReference" TEXT,
    operator_name TEXT,
    "operatorName" TEXT,
    intake_date DATE DEFAULT CURRENT_DATE,
    "intakeDate" TEXT,
    first_pass_time TEXT,
    "firstPassTime" TEXT,
    second_pass_time TEXT,
    "secondPassTime" TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: grain_suppliers
CREATE TABLE IF NOT EXISTS public.grain_suppliers (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    "institutionId" TEXT,
    name TEXT NOT NULL,
    phone_number TEXT,
    "phoneNumber" TEXT,
    id_number TEXT,
    "idNumber" TEXT,
    supplier_type TEXT DEFAULT 'Farmer',
    "supplierType" TEXT DEFAULT 'Farmer',
    location TEXT,
    bank_name TEXT,
    "bankName" TEXT,
    bank_account TEXT,
    "bankAccount" TEXT,
    mpesa_number TEXT,
    "mpesaNumber" TEXT,
    total_deliveries_kg NUMERIC(14,2) DEFAULT 0,
    "totalDeliveriesKg" NUMERIC(14,2) DEFAULT 0,
    total_amount_earned NUMERIC(14,2) DEFAULT 0,
    "totalAmountEarned" NUMERIC(14,2) DEFAULT 0,
    total_amount_paid NUMERIC(14,2) DEFAULT 0,
    "totalAmountPaid" NUMERIC(14,2) DEFAULT 0,
    outstanding_balance NUMERIC(14,2) DEFAULT 0,
    "outstandingBalance" NUMERIC(14,2) DEFAULT 0,
    contracted_acres NUMERIC(10,2) DEFAULT 0,
    "contractedAcres" NUMERIC(10,2) DEFAULT 0,
    advance_balance NUMERIC(12,2) DEFAULT 0,
    "advanceBalance" NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table: milling_silos
CREATE TABLE IF NOT EXISTS public.milling_silos (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    "institutionId" TEXT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'Silo',
    capacity_kg NUMERIC(14,2) DEFAULT 0,
    "capacityKg" NUMERIC(14,2) DEFAULT 0,
    current_stock_kg NUMERIC(14,2) DEFAULT 0,
    "currentStockKg" NUMERIC(14,2) DEFAULT 0,
    grain_type TEXT DEFAULT 'White Maize',
    "grainType" TEXT DEFAULT 'White Maize',
    avg_moisture_pct NUMERIC(6,2) DEFAULT 13.5,
    "avgMoisturePct" NUMERIC(6,2) DEFAULT 13.5,
    last_fumigation_date DATE,
    "lastFumigationDate" TEXT,
    next_fumigation_due DATE,
    "nextFumigationDue" TEXT,
    temperature_celsius NUMERIC(5,2),
    "temperatureCelsius" NUMERIC(5,2),
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table: milling_batch_runs
CREATE TABLE IF NOT EXISTS public.milling_batch_runs (
    id TEXT PRIMARY KEY,
    batch_number TEXT NOT NULL,
    "batchNumber" TEXT,
    institution_id TEXT,
    "institutionId" TEXT,
    source_silo_id TEXT,
    "sourceSiloId" TEXT,
    source_silo_name TEXT,
    "sourceSiloName" TEXT,
    operator_name TEXT,
    "operatorName" TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "startTime" TEXT,
    end_time TIMESTAMP WITH TIME ZONE,
    "endTime" TEXT,
    raw_maize_input_kg NUMERIC(12,2) DEFAULT 0,
    "rawMaizeInputKg" NUMERIC(12,2) DEFAULT 0,
    
    -- Yields & Outturns
    grade1_flour_kg NUMERIC(12,2) DEFAULT 0,
    "grade1FlourKg" NUMERIC(12,2) DEFAULT 0,
    grade2_flour_kg NUMERIC(12,2) DEFAULT 0,
    "grade2FlourKg" NUMERIC(12,2) DEFAULT 0,
    maize_bran_kg NUMERIC(12,2) DEFAULT 0,
    "maizeBranKg" NUMERIC(12,2) DEFAULT 0,
    maize_germ_kg NUMERIC(12,2) DEFAULT 0,
    "maizeGermKg" NUMERIC(12,2) DEFAULT 0,
    pollard_kg NUMERIC(12,2) DEFAULT 0,
    "pollardKg" NUMERIC(12,2) DEFAULT 0,
    milling_loss_kg NUMERIC(12,2) DEFAULT 0,
    "millingLossKg" NUMERIC(12,2) DEFAULT 0,
    
    -- Percentages
    grade1_yield_pct NUMERIC(6,2) DEFAULT 0,
    "grade1YieldPct" NUMERIC(6,2) DEFAULT 0,
    grade2_yield_pct NUMERIC(6,2) DEFAULT 0,
    "grade2YieldPct" NUMERIC(6,2) DEFAULT 0,
    byproducts_yield_pct NUMERIC(6,2) DEFAULT 0,
    "byproductsYieldPct" NUMERIC(6,2) DEFAULT 0,
    loss_pct NUMERIC(6,2) DEFAULT 0,
    "lossPct" NUMERIC(6,2) DEFAULT 0,
    
    fortification_dosing_grams NUMERIC(10,2) DEFAULT 0,
    "fortificationDosingGrams" NUMERIC(10,2) DEFAULT 0,
    power_units_kwh NUMERIC(10,2) DEFAULT 0,
    "powerUnitsKwh" NUMERIC(10,2) DEFAULT 0,
    labor_cost_kes NUMERIC(10,2) DEFAULT 0,
    "laborCostKES" NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'Completed',
    quality_approved_by TEXT,
    "qualityApprovedBy" TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table: flour_packaging_shifts
CREATE TABLE IF NOT EXISTS public.flour_packaging_shifts (
    id TEXT PRIMARY KEY,
    shift_code TEXT NOT NULL,
    "shiftCode" TEXT,
    institution_id TEXT,
    "institutionId" TEXT,
    batch_id TEXT,
    "batchId" TEXT,
    date DATE DEFAULT CURRENT_DATE,
    lead_worker_name TEXT,
    "leadWorkerName" TEXT,
    team_members JSONB DEFAULT '[]'::jsonb,
    "teamMembers" JSONB DEFAULT '[]'::jsonb,
    package_size TEXT DEFAULT '24x2kg Bale',
    "packageSize" TEXT DEFAULT '24x2kg Bale',
    flour_type TEXT DEFAULT 'Grade 1 Sifted',
    "flourType" TEXT DEFAULT 'Grade 1 Sifted',
    total_units_packed INTEGER DEFAULT 0,
    "totalUnitsPacked" INTEGER DEFAULT 0,
    total_weight_kg NUMERIC(12,2) DEFAULT 0,
    "totalWeightKg" NUMERIC(12,2) DEFAULT 0,
    rate_per_unit_kes NUMERIC(10,2) DEFAULT 0,
    "ratePerUnitKES" NUMERIC(10,2) DEFAULT 0,
    total_labor_cost_kes NUMERIC(12,2) DEFAULT 0,
    "totalLaborCostKES" NUMERIC(12,2) DEFAULT 0,
    packaging_bags_used INTEGER DEFAULT 0,
    "packagingBagsUsed" INTEGER DEFAULT 0,
    packaging_bags_damaged INTEGER DEFAULT 0,
    "packagingBagsDamaged" INTEGER DEFAULT 0,
    outer_bales_used INTEGER DEFAULT 0,
    "outerBalesUsed" INTEGER DEFAULT 0,
    lot_batch_code TEXT,
    "lotBatchCode" TEXT,
    expiry_date DATE,
    "expiryDate" TEXT,
    status TEXT DEFAULT 'Completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Table: animal_feed_batches
CREATE TABLE IF NOT EXISTS public.animal_feed_batches (
    id TEXT PRIMARY KEY,
    batch_code TEXT NOT NULL,
    "batchCode" TEXT,
    institution_id TEXT,
    "institutionId" TEXT,
    feed_type TEXT NOT NULL,
    "feedType" TEXT,
    raw_bran_used_kg NUMERIC(10,2) DEFAULT 0,
    "rawBranUsedKg" NUMERIC(10,2) DEFAULT 0,
    raw_germ_used_kg NUMERIC(10,2) DEFAULT 0,
    "rawGermUsedKg" NUMERIC(10,2) DEFAULT 0,
    pollard_used_kg NUMERIC(10,2) DEFAULT 0,
    "pollardUsedKg" NUMERIC(10,2) DEFAULT 0,
    additives_used_kg NUMERIC(10,2) DEFAULT 0,
    "additivesUsedKg" NUMERIC(10,2) DEFAULT 0,
    total_feed_output_kg NUMERIC(12,2) DEFAULT 0,
    "totalFeedOutputKg" NUMERIC(12,2) DEFAULT 0,
    bag_size_kg INTEGER DEFAULT 70,
    "bagSizeKg" INTEGER DEFAULT 70,
    bags_produced INTEGER DEFAULT 0,
    "bagsProduced" INTEGER DEFAULT 0,
    cost_per_bag_kes NUMERIC(10,2) DEFAULT 0,
    "costPerBagKES" NUMERIC(10,2) DEFAULT 0,
    selling_price_per_bag_kes NUMERIC(10,2) DEFAULT 0,
    "sellingPricePerBagKES" NUMERIC(10,2) DEFAULT 0,
    produced_date DATE DEFAULT CURRENT_DATE,
    "producedDate" TEXT,
    status TEXT DEFAULT 'In_Stock',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table: grain_sale_orders
CREATE TABLE IF NOT EXISTS public.grain_sale_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL,
    "orderNumber" TEXT,
    institution_id TEXT,
    "institutionId" TEXT,
    customer_name TEXT NOT NULL,
    "customerName" TEXT,
    customer_phone TEXT,
    "customerPhone" TEXT,
    customer_type TEXT DEFAULT 'Wholesaler',
    "customerType" TEXT DEFAULT 'Wholesaler',
    item_category TEXT DEFAULT 'Flour',
    "itemCategory" TEXT DEFAULT 'Flour',
    product_name TEXT NOT NULL,
    "productName" TEXT,
    unit_size TEXT DEFAULT '24x2kg Bale',
    "unitSize" TEXT DEFAULT '24x2kg Bale',
    quantity NUMERIC(10,2) DEFAULT 1,
    unit_price NUMERIC(12,2) DEFAULT 0,
    "unitPrice" NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(14,2) DEFAULT 0,
    "totalAmount" NUMERIC(14,2) DEFAULT 0,
    vat_amount NUMERIC(12,2) DEFAULT 0,
    "vatAmount" NUMERIC(12,2) DEFAULT 0,
    payment_method TEXT DEFAULT 'Bank Transfer',
    "paymentMethod" TEXT DEFAULT 'Bank Transfer',
    payment_status TEXT DEFAULT 'Paid',
    "paymentStatus" TEXT DEFAULT 'Paid',
    due_date DATE,
    "dueDate" TEXT,
    invoice_date DATE DEFAULT CURRENT_DATE,
    "invoiceDate" TEXT,
    delivery_location TEXT,
    "deliveryLocation" TEXT,
    dispatched_by TEXT,
    "dispatchedBy" TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_wb_tickets_inst ON public.weighbridge_intake_tickets(COALESCE(institution_id, "institutionId"));
CREATE INDEX IF NOT EXISTS idx_wb_tickets_num ON public.weighbridge_intake_tickets(COALESCE(ticket_number, "ticketNumber"));
CREATE INDEX IF NOT EXISTS idx_wb_tickets_supp ON public.weighbridge_intake_tickets(COALESCE(supplier_id, "supplierId"));
CREATE INDEX IF NOT EXISTS idx_grain_supp_inst ON public.grain_suppliers(COALESCE(institution_id, "institutionId"));
CREATE INDEX IF NOT EXISTS idx_milling_silos_inst ON public.milling_silos(COALESCE(institution_id, "institutionId"));
CREATE INDEX IF NOT EXISTS idx_milling_batches_inst ON public.milling_batch_runs(COALESCE(institution_id, "institutionId"));
CREATE INDEX IF NOT EXISTS idx_pkg_shifts_inst ON public.flour_packaging_shifts(COALESCE(institution_id, "institutionId"));
CREATE INDEX IF NOT EXISTS idx_feed_batches_inst ON public.animal_feed_batches(COALESCE(institution_id, "institutionId"));
CREATE INDEX IF NOT EXISTS idx_grain_sales_inst ON public.grain_sale_orders(COALESCE(institution_id, "institutionId"));

-- Enable Row Level Security
ALTER TABLE public.weighbridge_intake_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milling_silos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milling_batch_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flour_packaging_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_feed_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grain_sale_orders ENABLE ROW LEVEL SECURITY;

-- Scoped Institutional Tenancy RLS Policies
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'weighbridge_intake_tickets', 'grain_suppliers', 'milling_silos', 
        'milling_batch_runs', 'flour_packaging_shifts', 'animal_feed_batches', 
        'grain_sale_orders'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow public access to %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL) WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO authenticated, anon, service_role', t);
    END LOOP;
END $$;
