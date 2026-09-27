-- Migration 430: Enhance procurement suppliers and tenders with AGPO and financial compliance
-- Aligned with Public Procurement and Asset Disposal Act (PPADA 2015) and standard Ministry of Education tenders

ALTER TABLE procurement_suppliers
    ADD COLUMN IF NOT EXISTS tender_ref TEXT,
    ADD COLUMN IF NOT EXISTS tender_category_no TEXT,
    ADD COLUMN IF NOT EXISTS is_agpo BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS agpo_category TEXT DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS agpo_cert_number TEXT,
    ADD COLUMN IF NOT EXISTS tax_compliance_cert TEXT,
    ADD COLUMN IF NOT EXISTS business_permit_no TEXT,
    ADD COLUMN IF NOT EXISTS nca_reg_no TEXT,
    ADD COLUMN IF NOT EXISTS credit_period_days INTEGER DEFAULT 30,
    ADD COLUMN IF NOT EXISTS annual_turnover NUMERIC(15, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tender_fee_paid BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tender_fee_receipt_no TEXT,
    ADD COLUMN IF NOT EXISTS prequalification_score NUMERIC(5, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS prequalification_status TEXT DEFAULT 'pending';

-- Add vote head and withholding tax fields to procurement LPOs and Invoices
ALTER TABLE procurement_lpos
    ADD COLUMN IF NOT EXISTS vote_head TEXT,
    ADD COLUMN IF NOT EXISTS tender_category_no TEXT,
    ADD COLUMN IF NOT EXISTS tender_ref TEXT;

ALTER TABLE procurement_invoices
    ADD COLUMN IF NOT EXISTS vote_head TEXT,
    ADD COLUMN IF NOT EXISTS withholding_tax_rate NUMERIC(5, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS withholding_tax_amount NUMERIC(15, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS withholding_vat_amount NUMERIC(15, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_payable_amount NUMERIC(15, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_proc_supp_agpo ON procurement_suppliers(agpo_category);
CREATE INDEX IF NOT EXISTS idx_proc_supp_tender_cat ON procurement_suppliers(tender_category_no);
CREATE INDEX IF NOT EXISTS idx_proc_lpos_vote_head ON procurement_lpos(vote_head);
