-- Migration: 293_add_branch_grouping_columns.sql
-- Description: Add address, is_branch, and parent_institution_id to public.institutions, and linked_institution_id to public.branches

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'institutions') THEN
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS address TEXT;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS is_branch BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS parent_institution_id TEXT;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') THEN
        ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS linked_institution_id TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_institutions_parent ON public.institutions(parent_institution_id);
CREATE INDEX IF NOT EXISTS idx_branches_linked_inst ON public.branches(linked_institution_id);

NOTIFY pgrst, 'reload schema';
