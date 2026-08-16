-- Migration 327: Ensure law_agreement_templates and law_agreements tables exist with TEXT IDs
-- Description: Standardizes legal e-agreement templates and generated contracts with TEXT primary and foreign keys, robust indexes, and PostgREST cache reload.

CREATE TABLE IF NOT EXISTS public.law_agreement_templates (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    content TEXT NOT NULL,
    base_fee NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure text types if previously created as UUID
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'law_agreement_templates' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.law_agreement_templates ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'law_agreement_templates' 
          AND column_name = 'institution_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.law_agreement_templates ALTER COLUMN institution_id TYPE TEXT USING institution_id::TEXT;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.law_agreements (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    template_id TEXT,
    matter_id TEXT,
    client_id TEXT,
    title TEXT NOT NULL,
    party_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    final_content TEXT,
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
    review_status TEXT DEFAULT 'draft' CHECK (review_status IN ('draft', 'pending_approval', 'approved', 'rejected')),
    lawyer_id TEXT,
    lawyer_notes TEXT,
    signed_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure text types if previously created as UUID
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'law_agreements' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.law_agreements ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'law_agreements' 
          AND column_name = 'institution_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.law_agreements ALTER COLUMN institution_id TYPE TEXT USING institution_id::TEXT;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'law_agreements' 
          AND column_name = 'template_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.law_agreements ALTER COLUMN template_id TYPE TEXT USING template_id::TEXT;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_law_templates_inst ON public.law_agreement_templates(institution_id);
CREATE INDEX IF NOT EXISTS idx_law_templates_cat ON public.law_agreement_templates(category);
CREATE INDEX IF NOT EXISTS idx_law_agreements_inst ON public.law_agreements(institution_id);
CREATE INDEX IF NOT EXISTS idx_law_agreements_tmpl ON public.law_agreements(template_id);
CREATE INDEX IF NOT EXISTS idx_law_agreements_status ON public.law_agreements(review_status);

-- Enable RLS
ALTER TABLE public.law_agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.law_agreements ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies
DROP POLICY IF EXISTS "law_agreement_templates_all_access" ON public.law_agreement_templates;
CREATE POLICY "law_agreement_templates_all_access" ON public.law_agreement_templates
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "law_agreements_all_access" ON public.law_agreements;
CREATE POLICY "law_agreements_all_access" ON public.law_agreements
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant privileges
GRANT ALL ON public.law_agreement_templates TO anon, authenticated, service_role;
GRANT ALL ON public.law_agreements TO anon, authenticated, service_role;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
