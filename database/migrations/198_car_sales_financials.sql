
-- Migration 198: Car Sales Financials (Invoicing & Installments)
-- Focus: Automated invoicing, installment tracking, and receipt generation for vehicle sales.

-- 1. Sales Invoices
CREATE TABLE IF NOT EXISTS public.car_sales_invoices (
    id TEXT PRIMARY KEY,
    listing_id TEXT REFERENCES public.car_sales_listings(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL,
    
    -- Client Info
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    
    -- Financials
    total_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    balance_amount DECIMAL(15,2) NOT NULL,
    
    -- Status & Metadata
    status TEXT DEFAULT 'pending', -- 'pending', 'partially_paid', 'fully_paid', 'cancelled'
    due_date TIMESTAMPTZ,
    invoice_number TEXT UNIQUE,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Sales Payments (Installments)
CREATE TABLE IF NOT EXISTS public.car_sales_payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT REFERENCES public.car_sales_invoices(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL,
    
    amount DECIMAL(15,2) NOT NULL,
    payment_method TEXT NOT NULL, -- 'MPESA', 'Bank Transfer', 'Cash', 'Card'
    transaction_reference TEXT,
    payment_date TIMESTAMPTZ DEFAULT now(),
    receipt_number TEXT UNIQUE,
    
    received_by TEXT, -- User ID
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS POLICIES
ALTER TABLE public.car_sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_sales_payments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t text;
    tables text[] := ARRAY['car_sales_invoices', 'car_sales_payments'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Invoices Manage Policy" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Payments Manage Policy" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all on %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL) WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;

-- Trigger to update invoice balance and status when a payment is added
CREATE OR REPLACE FUNCTION public.update_car_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.car_sales_invoices
    SET 
        paid_amount = paid_amount + NEW.amount,
        balance_amount = total_amount - (paid_amount + NEW.amount),
        status = CASE 
            WHEN (paid_amount + NEW.amount) >= total_amount THEN 'fully_paid'
            WHEN (paid_amount + NEW.amount) > 0 THEN 'partially_paid'
            ELSE 'pending'
        END,
        updated_at = now()
    WHERE id = NEW.invoice_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_update_car_invoice_on_payment ON public.car_sales_payments;
CREATE TRIGGER trg_update_car_invoice_on_payment
AFTER INSERT ON public.car_sales_payments
FOR EACH ROW EXECUTE FUNCTION public.update_car_invoice_on_payment();

REVOKE EXECUTE ON FUNCTION public.update_car_invoice_on_payment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_car_invoice_on_payment() TO postgres, service_role;
