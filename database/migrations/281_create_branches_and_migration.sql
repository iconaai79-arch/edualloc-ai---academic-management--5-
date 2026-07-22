-- Migration: 281_create_branches_and_migration.sql
-- Description: Create public.branches table, instantiate default branches, and migrate existing tables to be branch-aware.

CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branches_institution ON public.branches(institution_id);

-- Insert a default branch for each existing institution
INSERT INTO public.branches (id, institution_id, name, location)
SELECT 
    'br_main_' || id,
    id,
    'Default Branch',
    'Main Location'
FROM public.institutions
ON CONFLICT (id) DO NOTHING;

-- Add branch_id to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch_id TEXT;

-- Add branch_id to public.invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS branch_id TEXT;

-- Add branch_id to public.receipts
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS branch_id TEXT;

-- Backfill branch_id for existing records (only if institution exists)
UPDATE public.users 
SET branch_id = 'br_main_' || institution_id 
WHERE branch_id IS NULL 
  AND institution_id IS NOT NULL 
  AND institution_id IN (SELECT id FROM public.institutions);

UPDATE public.invoices 
SET branch_id = 'br_main_' || institution_id 
WHERE branch_id IS NULL 
  AND institution_id IS NOT NULL 
  AND institution_id IN (SELECT id FROM public.institutions);

UPDATE public.receipts 
SET branch_id = 'br_main_' || institution_id 
WHERE branch_id IS NULL 
  AND institution_id IS NOT NULL 
  AND institution_id IN (SELECT id FROM public.institutions);

-- Now add foreign key constraints for branch_id
ALTER TABLE public.users 
    DROP CONSTRAINT IF EXISTS fk_users_branch,
    ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.invoices 
    DROP CONSTRAINT IF EXISTS fk_invoices_branch,
    ADD CONSTRAINT fk_invoices_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.receipts 
    DROP CONSTRAINT IF EXISTS fk_receipts_branch,
    ADD CONSTRAINT fk_receipts_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- Create indexes on branch_id for optimal querying
CREATE INDEX IF NOT EXISTS idx_users_branch ON public.users(branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_branch ON public.invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_receipts_branch ON public.receipts(branch_id);
