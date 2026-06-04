-- SQL script to sync and match bank transactions from integration logs
-- This parses the raw JSON payload in integration_logs and inserts matching records to bank_transactions.
-- Run this in your Supabase SQL editor to create the function, then execute:
-- SELECT public.sync_bank_transactions_from_logs();

CREATE OR REPLACE FUNCTION public.sync_bank_transactions_from_logs()
RETURNS integer AS $$
DECLARE
    log_rec RECORD;
    resolved_inst_id TEXT;
    payload_ref TEXT;
    payload_amount DECIMAL(12,2);
    payload_date TIMESTAMP WITH TIME ZONE;
    payload_txn_id TEXT;
    payload_sender TEXT;
    payload_credit_acc TEXT;
    payload_shortcode TEXT;
    sync_count integer := 0;
BEGIN
    FOR log_rec IN 
        SELECT id, payload, created_at 
        FROM public.integration_logs 
        WHERE provider = 'kcb_ipn' AND payload IS NOT NULL
    LOOP
        -- Reset variables
        resolved_inst_id := NULL;
        
        -- Parse values from JSON payload
        payload_txn_id := log_rec.payload->>'transactionReference';
        payload_ref := log_rec.payload->>'customerReference';
        payload_amount := (log_rec.payload->>'transactionAmount')::decimal;
        payload_sender := log_rec.payload->>'customerName';
        payload_credit_acc := log_rec.payload->>'creditAccountIdentifier';
        payload_shortcode := log_rec.payload->>'organizationShortCode';
        
        -- Handle timestamp parsing
        BEGIN
            payload_date := (log_rec.payload->>'timestamp')::timestamp with time zone;
        EXCEPTION WHEN OTHERS THEN
            payload_date := log_rec.created_at;
        END;
        
        IF payload_txn_id IS NULL THEN
            CONTINUE;
        END IF;

        -- 1. Try to resolve institution by creditAccountIdentifier directly matching institution ID
        IF payload_credit_acc IS NOT NULL AND payload_credit_acc <> '' THEN
            SELECT id INTO resolved_inst_id 
            FROM public.institutions 
            WHERE id = payload_credit_acc;
        END IF;

        -- 2. Try to resolve by mpesa_paybill shortcode
        IF resolved_inst_id IS NULL AND payload_shortcode IS NOT NULL AND payload_shortcode <> '' THEN
            SELECT id INTO resolved_inst_id 
            FROM public.institutions 
            WHERE mpesa_paybill = payload_shortcode OR (metadata->>'mpesa_paybill') = payload_shortcode;
        END IF;

        -- 3. Try to resolve by matching customerReference to invoice number across tables
        IF resolved_inst_id IS NULL AND payload_ref IS NOT NULL AND payload_ref <> '' THEN
            -- Check car_invoices (Automotive Marketplace)
            SELECT "institutionId" INTO resolved_inst_id 
            FROM public.car_invoices 
            WHERE "invoiceNumber" = payload_ref 
            LIMIT 1;
            
            -- Check regular invoices (Academic)
            IF resolved_inst_id IS NULL THEN
                SELECT institution_id INTO resolved_inst_id 
                FROM public.invoices 
                WHERE invoice_number = payload_ref 
                LIMIT 1;
            END IF;
            
            -- Check ds_invoices (Driving School)
            IF resolved_inst_id IS NULL THEN
                SELECT institution_id INTO resolved_inst_id 
                FROM public.ds_invoices 
                WHERE invoice_number = payload_ref 
                LIMIT 1;
            END IF;

            -- Check pm_invoices (Property Management)
            IF resolved_inst_id IS NULL THEN
                SELECT institution_id INTO resolved_inst_id 
                FROM public.pm_invoices 
                WHERE invoice_number = payload_ref 
                LIMIT 1;
            END IF;
        END IF;

        -- 4. If we successfully resolved the institution_id, upsert to bank_transactions
        IF resolved_inst_id IS NOT NULL THEN
            -- Check if invoice exists and has been reconciled/paid
            DECLARE
                is_reconciled boolean := false;
            BEGIN
                -- If there is a matching invoice, check if it's settled/paid
                IF EXISTS (SELECT 1 FROM public.car_invoices WHERE "invoiceNumber" = payload_ref AND status = 'paid') OR
                   EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = payload_ref AND status = 'paid') OR
                   EXISTS (SELECT 1 FROM public.ds_invoices WHERE invoice_number = payload_ref AND status = 'paid') OR
                   EXISTS (SELECT 1 FROM public.pm_invoices WHERE invoice_number = payload_ref AND status = 'paid')
                THEN
                    is_reconciled := true;
                END IF;

                INSERT INTO public.bank_transactions (
                    id,
                    institution_id,
                    amount,
                    transaction_date,
                    reference,
                    sender_name,
                    bank_name,
                    status,
                    reconciled_at,
                    reconciled_by,
                    created_at
                ) VALUES (
                    payload_txn_id,
                    resolved_inst_id,
                    COALESCE(payload_amount, 0),
                    COALESCE(payload_date, log_rec.created_at),
                    payload_txn_id,
                    COALESCE(payload_sender, 'External Deposit'),
                    'KCB',
                    CASE WHEN is_reconciled THEN 'reconciled' ELSE 'unreconciled' END,
                    CASE WHEN is_reconciled THEN NOW() ELSE NULL END,
                    CASE WHEN is_reconciled THEN 'Log Sync Utility' ELSE NULL END,
                    log_rec.created_at
                )
                ON CONFLICT (id) DO UPDATE SET
                    institution_id = EXCLUDED.institution_id,
                    status = EXCLUDED.status,
                    reconciled_at = COALESCE(bank_transactions.reconciled_at, EXCLUDED.reconciled_at),
                    reconciled_by = COALESCE(bank_transactions.reconciled_by, EXCLUDED.reconciled_by);
                
                sync_count := sync_count + 1;
            END;
        END IF;
    END LOOP;
    
    RETURN sync_count;
END;
$$ LANGUAGE plpgsql;
