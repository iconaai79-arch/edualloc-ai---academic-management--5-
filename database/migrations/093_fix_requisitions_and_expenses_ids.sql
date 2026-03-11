-- Migration 093: Fix Requisitions and Retail Expenses ID Types
-- This migration converts ID columns to TEXT to support custom alphanumeric prefixes.

DO $$ 
BEGIN
    -- 1. Drop constraints that block type conversion
    ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_pkey;
    ALTER TABLE public.requisitions DROP CONSTRAINT IF EXISTS requisitions_store_id_fkey;
    ALTER TABLE public.retail_expenses DROP CONSTRAINT IF EXISTS retail_expenses_pkey;
    ALTER TABLE public.retail_expenses DROP CONSTRAINT IF EXISTS retail_expenses_recorded_by_id_fkey;

    -- 2. Convert requisitions.id to TEXT if it's UUID
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'id' AND data_type = 'uuid') THEN
        ALTER TABLE public.requisitions ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    -- 3. Ensure retail_expenses.id is TEXT (redundant but safe)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retail_expenses' AND column_name = 'id' AND data_type = 'uuid') THEN
        ALTER TABLE public.retail_expenses ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    -- 4. Ensure foreign key columns are also TEXT
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'store_id' AND data_type = 'uuid') THEN
        ALTER TABLE public.requisitions ALTER COLUMN store_id TYPE TEXT USING store_id::text;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retail_expenses' AND column_name = 'recorded_by_id' AND data_type = 'uuid') THEN
        ALTER TABLE public.retail_expenses ALTER COLUMN recorded_by_id TYPE TEXT USING recorded_by_id::text;
    END IF;

    -- 5. Re-add Primary Keys
    ALTER TABLE public.requisitions ADD PRIMARY KEY (id);
    ALTER TABLE public.retail_expenses ADD PRIMARY KEY (id);

    -- 6. Add back foreign keys ONLY if types are compatible and column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requisitions' AND column_name = 'store_id') THEN
        ALTER TABLE public.requisitions ADD CONSTRAINT requisitions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.retail_stores(id) ON DELETE SET NULL;
    END IF;

    -- 7. Update RLS Policies for robust casting
    DROP POLICY IF EXISTS "Users can view their institution's retail_expenses" ON public.retail_expenses;
    DROP POLICY IF EXISTS "Admins/Managers can manage their institution's retail_expenses" ON public.retail_expenses;

    CREATE POLICY "Users can view their institution's retail_expenses"
        ON public.retail_expenses FOR SELECT
        USING (institution_id::text = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

    CREATE POLICY "Admins/Managers can manage their institution's retail_expenses"
        ON public.retail_expenses FOR ALL
        USING (
            (institution_id::text = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'field_agent', 'property_admin', 'reseller'))
            OR public.get_curr_user_role() = 'super_admin'
        );

END $$;
