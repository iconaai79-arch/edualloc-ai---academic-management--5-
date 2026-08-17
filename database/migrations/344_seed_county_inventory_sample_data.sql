-- Migration 344: Seed sample county inventory, categories, and physical stores
-- Description: Ensures missing columns (e.g. updated_at, created_at) exist and seeds realistic Kenyan county educational, medical, agricultural, and vocational inventory records.

-- 1. Ensure all columns exist across county inventory tables (to support pre-existing schemas)
ALTER TABLE public.county_inventory_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.county_inventory_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.county_inventory_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.county_stores ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE public.county_stores ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE public.county_stores ADD COLUMN IF NOT EXISTS longitude FLOAT;
ALTER TABLE public.county_stores ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.county_stores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.county_stores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Units';
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'at_hq';
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS target_institution_id TEXT;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'driver';
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS at_hq_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS recipient_signature TEXT;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS received_by TEXT;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS dispatched_date TIMESTAMPTZ;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS received_date TIMESTAMPTZ;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.county_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DO $$
DECLARE
    target_county_id TEXT;
    target_inst_id TEXT;
BEGIN
    -- 2. Resolve county_id (from existing counties or fallback)
    SELECT id INTO target_county_id FROM public.counties LIMIT 1;
    IF target_county_id IS NULL THEN
        target_county_id := 'county_nandi_029';
        INSERT INTO public.counties (id, name, code, created_at)
        VALUES (target_county_id, 'Nandi County', '029', NOW())
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 3. Resolve institution_id for dispatches (from existing institutions or fallback)
    SELECT id INTO target_inst_id FROM public.institutions LIMIT 1;
    IF target_inst_id IS NULL THEN
        target_inst_id := 'inst_sample_school_01';
    END IF;

    -- 4. Seed Inventory Categories
    INSERT INTO public.county_inventory_categories (id, county_id, name, description, created_at, updated_at)
    VALUES
        ('cat_edu_cbc_01', target_county_id, 'Educational Learning Materials', 'CBC textbooks, science lab reagents, revision past papers, and charts', NOW(), NOW()),
        ('cat_ict_dig_02', target_county_id, 'ICT & Digital Devices', 'Student tablets, teacher laptops, smart projectors, and networking equipment', NOW(), NOW()),
        ('cat_ecde_nut_03', target_county_id, 'ECDE & Daycare Nutrition', 'Fortified porridge flour (Unimix), milk cartons, and school feeding supplies', NOW(), NOW()),
        ('cat_med_hosp_04', target_county_id, 'Hospital & Medical Supplies', 'First aid kits, examination gloves, sanitizers, and diagnostic tools', NOW(), NOW()),
        ('cat_agri_seed_05', target_county_id, 'Agricultural Inputs & Seeds', 'Certified maize/bean hybrid seeds, organic fertilizers, and sprayers', NOW(), NOW()),
        ('cat_voc_tool_06', target_county_id, 'Vocational & TVET Toolsets', 'Carpentry, electrical wiring kits, plumbing wrenches, and welding gear', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        updated_at = NOW();

    -- 5. Seed County Physical Stores / Depots
    INSERT INTO public.county_stores (id, county_id, name, location_name, latitude, longitude, description, created_at, updated_at)
    VALUES
        ('store_hq_central', target_county_id, 'Central County HQ Warehouse', 'County Headquarters, Block B', -1.286389, 36.817223, 'Main county logistics receiving and consolidation hub', NOW(), NOW()),
        ('store_depot_east', target_county_id, 'Sub-County East Distribution Depot', 'East Sub-County Education Office', -1.2921, 36.8850, 'Zonal dispatch store for eastern zone schools', NOW(), NOW()),
        ('store_depot_west', target_county_id, 'Sub-County West Medical & Supply Hub', 'West Sub-County Health Complex', -1.2750, 36.7500, 'Zonal store for polytechnics and dispensaries', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        location_name = EXCLUDED.location_name,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        description = EXCLUDED.description,
        updated_at = NOW();

    -- 6. Seed County Inventory Items
    INSERT INTO public.county_inventory (
        id, county_id, name, category, quantity, unit, supplier_name,
        status, target_institution_id, driver_name, delivery_method, tracking_number,
        qr_code, at_hq_date, recipient_name, dispatched_date, received_date,
        created_at, updated_at
    )
    VALUES
        (
            'inv_sample_001', target_county_id, 'CBC Grade 8 Integrated Science Textbooks',
            'Educational Learning Materials', 2500, 'Copies', 'Kenya Literature Bureau (KLB)',
            'at_hq', target_inst_id, '', 'driver', '',
            'QR-INV-CBC-001', NOW() - INTERVAL '4 days', '', NULL, NULL,
            NOW(), NOW()
        ),
        (
            'inv_sample_002', target_county_id, 'Student Digital Learning Tablets (10-inch Touch)',
            'ICT & Digital Devices', 350, 'Units', 'Moi University Digital Labs',
            'in_transit', target_inst_id, 'Kipchumba Korir (KBX 419P)', 'driver', 'TRK-MOI-9921',
            'QR-INV-TAB-002', NOW() - INTERVAL '3 days', 'Kipchumba Korir', NOW() - INTERVAL '1 day', NULL,
            NOW(), NOW()
        ),
        (
            'inv_sample_003', target_county_id, 'ECDE Fortified Porridge Flour (25kg Sacks)',
            'ECDE & Daycare Nutrition', 600, 'Bags', 'National Cereals & Produce Board (NCPB)',
            'at_hq', target_inst_id, '', 'driver', '',
            'QR-INV-NCPB-003', NOW() - INTERVAL '5 days', '', NULL, NULL,
            NOW(), NOW()
        ),
        (
            'inv_sample_004', target_county_id, 'Primary Healthcare First Aid & PPE Master Kits',
            'Hospital & Medical Supplies', 1200, 'Kits', 'KEMSA Medical Logistics',
            'received', target_inst_id, 'G4S Courier Express', 'parcel', 'G4S-KEMSA-77812',
            'QR-INV-MED-004', NOW() - INTERVAL '10 days', 'Sister Faith Wambui (Head Nurse)', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days',
            NOW(), NOW()
        ),
        (
            'inv_sample_005', target_county_id, 'Certified Hybrid Maize Seeds (DK 777 - 10kg)',
            'Agricultural Inputs & Seeds', 850, 'Bags', 'Kenya Seed Company Ltd',
            'at_hq', target_inst_id, '', 'driver', '',
            'QR-INV-SEED-005', NOW() - INTERVAL '2 days', '', NULL, NULL,
            NOW(), NOW()
        ),
        (
            'inv_sample_006', target_county_id, 'Solar Robotic Science Experiment Kits',
            'Educational Learning Materials', 180, 'Kits', 'STEM Education Africa Ltd',
            'in_transit', target_inst_id, 'Mwangi Kamau (KCY 884L)', 'driver', 'TRK-STEM-4432',
            'QR-INV-STEM-006', NOW() - INTERVAL '2 days', 'Mwangi Kamau', NOW() - INTERVAL '12 hours', NULL,
            NOW(), NOW()
        ),
        (
            'inv_sample_007', target_county_id, 'Heavy-Duty Carpentry & Woodwork Toolboxes',
            'Vocational & TVET Toolsets', 90, 'Sets', 'Apex Hardware & Tools Kenya',
            'received', target_inst_id, 'Boda Courier Logistics', 'driver', 'BODA-APX-119',
            'QR-INV-VOC-007', NOW() - INTERVAL '14 days', 'Eng. Otieno (Workshop Master)', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days',
            NOW(), NOW()
        )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        quantity = EXCLUDED.quantity,
        unit = EXCLUDED.unit,
        supplier_name = EXCLUDED.supplier_name,
        status = EXCLUDED.status,
        target_institution_id = EXCLUDED.target_institution_id,
        driver_name = EXCLUDED.driver_name,
        delivery_method = EXCLUDED.delivery_method,
        tracking_number = EXCLUDED.tracking_number,
        qr_code = EXCLUDED.qr_code,
        updated_at = NOW();

END $$;

-- 7. Enable RLS and Permissive Policies
ALTER TABLE public.county_inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.county_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.county_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "county_inventory_categories_all_access" ON public.county_inventory_categories;
CREATE POLICY "county_inventory_categories_all_access" ON public.county_inventory_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "county_stores_all_access" ON public.county_stores;
CREATE POLICY "county_stores_all_access" ON public.county_stores FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "county_inventory_all_access" ON public.county_inventory;
CREATE POLICY "county_inventory_all_access" ON public.county_inventory FOR ALL USING (true) WITH CHECK (true);

-- 8. Permissions
GRANT ALL ON public.county_inventory_categories TO anon, authenticated, service_role;
GRANT ALL ON public.county_stores TO anon, authenticated, service_role;
GRANT ALL ON public.county_inventory TO anon, authenticated, service_role;

-- 9. Reload schema cache
NOTIFY pgrst, 'reload schema';
