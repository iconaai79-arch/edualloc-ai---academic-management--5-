-- Migration 375: Create bank_accounts view or alias for school_bank_accounts
-- Description: Ensures queries targeting public.bank_accounts seamlessly resolve to public.school_bank_accounts

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_bank_accounts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bank_accounts') THEN
            CREATE OR REPLACE VIEW public.bank_accounts AS 
            SELECT 
                id,
                institution_id,
                bank_name,
                account_name,
                account_number,
                branch_name,
                currency,
                status,
                created_at
            FROM public.school_bank_accounts;

            GRANT ALL ON public.bank_accounts TO anon, authenticated, service_role;
        END IF;
    END IF;
END $$;
