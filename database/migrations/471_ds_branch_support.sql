-- Migration: 471_ds_branch_support.sql
-- Description: Add branch support to all Driving School (DS) module tables,
-- enhance public.branches with operational metadata, backfill default branches,
-- and add high-performance composite indexes for branch-scoped querying.

-- 1. Ensure public.branches table has all operational columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches') THEN
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS code TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS manager_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Ensure default branches exist for all Driving School institutions
INSERT INTO public.branches (id, institution_id, name, location, code, is_active)
SELECT 
    'br_main_' || id,
    id,
    'Main Campus / HQ',
    COALESCE(address, 'Main Location'),
    'MAIN',
    TRUE
FROM public.institutions
WHERE (institution_type ILIKE '%Driving%' OR category ILIKE '%Driving%')
ON CONFLICT (id) DO NOTHING;

-- 3. Add branch_id columns to all DS tables
DO $$
BEGIN
    -- ds_students
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_students') THEN
        ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    -- ds_instructors
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_instructors') THEN
        ALTER TABLE public.ds_instructors ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    -- ds_vehicles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_vehicles') THEN
        ALTER TABLE public.ds_vehicles ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    -- ds_lessons
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_lessons') THEN
        ALTER TABLE public.ds_lessons ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    -- ds_invoices
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_invoices') THEN
        ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    -- ds_payments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_payments') THEN
        ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    -- ds_leads
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_leads') THEN
        ALTER TABLE public.ds_leads ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    -- ds_expenditures
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_expenditures') THEN
        ALTER TABLE public.ds_expenditures ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;

    -- ds_fee_structures (NULL branch_id means globally applicable across all branches)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_fee_structures') THEN
        ALTER TABLE public.ds_fee_structures ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Backfill existing records with the institution's default branch
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') THEN
        -- Backfill ds_students
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_students') THEN
            UPDATE public.ds_students s
            SET branch_id = 'br_main_' || s.institution_id
            WHERE s.branch_id IS NULL 
              AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = 'br_main_' || s.institution_id);
        END IF;

        -- Backfill ds_instructors
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_instructors') THEN
            UPDATE public.ds_instructors i
            SET branch_id = 'br_main_' || i.institution_id
            WHERE i.branch_id IS NULL 
              AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = 'br_main_' || i.institution_id);
        END IF;

        -- Backfill ds_vehicles
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_vehicles') THEN
            UPDATE public.ds_vehicles v
            SET branch_id = 'br_main_' || v.institution_id
            WHERE v.branch_id IS NULL 
              AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = 'br_main_' || v.institution_id);
        END IF;

        -- Backfill ds_lessons
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_lessons') THEN
            UPDATE public.ds_lessons l
            SET branch_id = 'br_main_' || l.institution_id
            WHERE l.branch_id IS NULL 
              AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = 'br_main_' || l.institution_id);
        END IF;

        -- Backfill ds_invoices
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_invoices') THEN
            UPDATE public.ds_invoices inv
            SET branch_id = 'br_main_' || inv.institution_id
            WHERE inv.branch_id IS NULL 
              AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = 'br_main_' || inv.institution_id);
        END IF;

        -- Backfill ds_payments
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_payments') THEN
            UPDATE public.ds_payments p
            SET branch_id = 'br_main_' || p.institution_id
            WHERE p.branch_id IS NULL 
              AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = 'br_main_' || p.institution_id);
        END IF;

        -- Backfill ds_leads
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_leads') THEN
            UPDATE public.ds_leads ld
            SET branch_id = 'br_main_' || ld.institution_id
            WHERE ld.branch_id IS NULL 
              AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = 'br_main_' || ld.institution_id);
        END IF;

        -- Backfill ds_expenditures
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ds_expenditures') THEN
            UPDATE public.ds_expenditures exp
            SET branch_id = 'br_main_' || exp.institution_id
            WHERE exp.branch_id IS NULL 
              AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = 'br_main_' || exp.institution_id);
        END IF;
    END IF;
END $$;

-- 5. Composite Indexes for Fast Multi-Branch Queries
CREATE INDEX IF NOT EXISTS idx_ds_students_inst_branch ON public.ds_students(institution_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_ds_instructors_inst_branch ON public.ds_instructors(institution_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_ds_vehicles_inst_branch ON public.ds_vehicles(institution_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_ds_lessons_inst_branch ON public.ds_lessons(institution_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_ds_invoices_inst_branch ON public.ds_invoices(institution_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_branch ON public.ds_payments(institution_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_ds_leads_inst_branch ON public.ds_leads(institution_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_ds_expenditures_inst_branch ON public.ds_expenditures(institution_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_ds_fee_structures_inst_branch ON public.ds_fee_structures(institution_id, branch_id);

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
