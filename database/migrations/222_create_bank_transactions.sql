-- 222. CREATE BANK TRANSACTIONS TABLE
-- Stores bank-received payments (reconciled or unreconciled) for general academic, driving school, and property management modules.

CREATE TABLE IF NOT EXISTS bank_transactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reference TEXT NOT NULL,
    sender_name TEXT,
    bank_name TEXT,
    status TEXT NOT NULL DEFAULT 'unreconciled', -- 'reconciled' or 'unreconciled'
    linked_invoice_id TEXT,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    reconciled_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payload JSONB
);

-- Enable RLS for bank_transactions
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- Apply standard dynamic RLS policies
DO $$
DECLARE
    t text := 'bank_transactions';
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Institutional tenancy select: %I" ON %I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
    
    EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Institutional tenancy manage: %I" ON %I FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
    
    EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
END $$;
