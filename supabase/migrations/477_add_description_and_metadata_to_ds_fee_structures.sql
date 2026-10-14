-- Migration 477: Add description, branch_id, and metadata to ds_fee_structures
-- Resolves: "[api/records] Schema cache stale: stripping un-cached column 'description' for [ds_fee_structures]"

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ds_fee_structures'
    ) THEN
        -- Add description column
        ALTER TABLE public.ds_fee_structures ADD COLUMN IF NOT EXISTS description TEXT;

        -- Add branch_id column if not previously present
        ALTER TABLE public.ds_fee_structures ADD COLUMN IF NOT EXISTS branch_id TEXT;

        -- Add metadata column for extensible attributes
        ALTER TABLE public.ds_fee_structures ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Also ensure bc_fee_structures has description, branch_id, and metadata for consistency
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'bc_fee_structures'
    ) THEN
        ALTER TABLE public.bc_fee_structures ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.bc_fee_structures ADD COLUMN IF NOT EXISTS branch_id TEXT;
        ALTER TABLE public.bc_fee_structures ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
