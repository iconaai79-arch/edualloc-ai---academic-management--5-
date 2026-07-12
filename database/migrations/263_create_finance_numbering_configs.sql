-- Migration: 263_create_finance_numbering_configs.sql
-- Description: Create table for storing customizable document numbering prefixes and sequence values.

CREATE TABLE IF NOT EXISTS public.finance_numbering_configs (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- 'invoice', 'receipt', 'payment_voucher', 'credit_note', 'debit_note', 'goods_in_lieu'
    prefix TEXT NOT NULL,
    next_number INTEGER NOT NULL DEFAULT 1001,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_inst_doc_type UNIQUE (institution_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_finance_numbering_configs_inst ON public.finance_numbering_configs(institution_id);
