-- Migration 429: Drop institution_id FK constraints from billing tables
-- Purpose: The invoices, receipts, and invoice_clients tables are used for both:
--   1. Tenant-level student/school fee invoices (institution_id = tenant id)
--   2. Super-admin corporate B2B invoices (institution_id = 'GLOBAL')
--
-- The existing FK invoices_institution_id_fkey (and equivalents on receipts /
-- invoice_clients) only validates against the institutions table, causing a
-- FK violation whenever a corporate invoice is created with institution_id = 'GLOBAL'
-- (which is not a real row in the institutions table).
--
-- Fix: Drop the institution_id FKs from these billing tables.
-- Tenant isolation is enforced at the application layer (apiService.fetchModuleRecords
-- always filters by institution_id) so removing the DB-level FK does not weaken
-- multi-tenancy. The column and its index are preserved for query performance.

DO $$
DECLARE
    r RECORD;
BEGIN

    -- ── invoices ─────────────────────────────────────────────────────────────
    FOR r IN
        SELECT conname
        FROM   pg_constraint
        WHERE  conrelid = 'public.invoices'::regclass
          AND  contype  = 'f'
          AND  conname  ILIKE '%institution%'
    LOOP
        EXECUTE format('ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped FK % from invoices', r.conname;
    END LOOP;

    -- ── receipts ─────────────────────────────────────────────────────────────
    FOR r IN
        SELECT conname
        FROM   pg_constraint
        WHERE  conrelid = 'public.receipts'::regclass
          AND  contype  = 'f'
          AND  conname  ILIKE '%institution%'
    LOOP
        EXECUTE format('ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped FK % from receipts', r.conname;
    END LOOP;

    -- ── invoice_clients ───────────────────────────────────────────────────────
    FOR r IN
        SELECT conname
        FROM   pg_constraint
        WHERE  conrelid = 'public.invoice_clients'::regclass
          AND  contype  = 'f'
          AND  conname  ILIKE '%institution%'
    LOOP
        EXECUTE format('ALTER TABLE public.invoice_clients DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped FK % from invoice_clients', r.conname;
    END LOOP;

    -- ── company_invoice_settings ──────────────────────────────────────────────
    FOR r IN
        SELECT conname
        FROM   pg_constraint
        WHERE  conrelid = 'public.company_invoice_settings'::regclass
          AND  contype  = 'f'
          AND  conname  ILIKE '%institution%'
    LOOP
        EXECUTE format('ALTER TABLE public.company_invoice_settings DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped FK % from company_invoice_settings', r.conname;
    END LOOP;

    -- ── finance_numbering_configs ─────────────────────────────────────────────
    FOR r IN
        SELECT conname
        FROM   pg_constraint
        WHERE  conrelid = 'public.finance_numbering_configs'::regclass
          AND  contype  = 'f'
          AND  conname  ILIKE '%institution%'
    LOOP
        EXECUTE format('ALTER TABLE public.finance_numbering_configs DROP CONSTRAINT IF EXISTS %I', r.conname);
        RAISE NOTICE 'Dropped FK % from finance_numbering_configs', r.conname;
    END LOOP;

    RAISE NOTICE 'Migration 429 complete — institution FK constraints removed from billing tables.';

END $$;

-- Keep institution_id indexes intact for query performance
CREATE INDEX IF NOT EXISTS idx_invoices_institution_id
    ON public.invoices (institution_id);

CREATE INDEX IF NOT EXISTS idx_receipts_institution_id
    ON public.receipts (institution_id);

CREATE INDEX IF NOT EXISTS idx_invoice_clients_institution_id
    ON public.invoice_clients (institution_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
