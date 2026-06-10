-- Trigger to automatically match and sync bank transactions from incoming IPN logs
-- Run this in your Supabase SQL Editor

-- Create a more efficient trigger function that only processes the new row
CREATE OR REPLACE FUNCTION public.trigger_sync_new_integration_log()
RETURNS TRIGGER AS $$
DECLARE
    resolved_inst_id TEXT;
    resolved_invoice_id TEXT;
    payload_ref TEXT;
    payload_amount DECIMAL(12,2);
    payload_date TIMESTAMP WITH TIME ZONE;
    payload_txn_id TEXT;
    payload_sender TEXT;
    payload_credit_acc TEXT;
    payload_shortcode TEXT;
    is_reconciled boolean := false;
BEGIN
    -- Only process KCB or STK callbacks that have a payload
    IF (NEW.provider LIKE 'kcb%' OR NEW.provider = 'kcb_ipn' OR NEW.provider = 'kcb_stk_callback') AND NEW.payload IS NOT NULL THEN
        -- Parse values from JSON payload dynamically
        payload_txn_id := COALESCE(
            NEW.payload->>'transactionReference',
            NEW.payload->>'checkoutRequestId',
            NEW.payload->>'checkoutRequestID',
            NEW.payload->>'requestId',
            NEW.payload->>'transactionId',
            NEW.payload->>'transactionID',
            NEW.payload->'Body'->'stkCallback'->>'CheckoutRequestID',
            NEW.payload->'requestPayload'->'primaryData'->>'checkoutRequestID'
        );
        
        payload_ref := COALESCE(
            NEW.payload->>'customerReference',
            NEW.payload->>'accountReference',
            NEW.payload->'requestPayload'->'primaryData'->>'businessKey',
            NEW.payload->>'businessKey'
        );

        BEGIN
            payload_amount := COALESCE(
                (NEW.payload->>'transactionAmount')::decimal,
                (NEW.payload->>'amount')::decimal,
                0.00
            );
        EXCEPTION WHEN OTHERS THEN
            payload_amount := 0.00;
        END;

        payload_sender := COALESCE(
            NEW.payload->>'customerName',
            NEW.payload->>'payerName',
            NEW.payload->>'customerMobileNumber',
            NEW.payload->>'phoneNumber',
            'External Deposit'
        );

        payload_credit_acc := COALESCE(
            NEW.payload->>'creditAccountIdentifier',
            NEW.payload->>'institutionId',
            NEW.payload->>'institution_id'
        );

        payload_shortcode := COALESCE(
            NEW.payload->>'organizationShortCode',
            NEW.payload->>'shortCode',
            NEW.payload->>'short_code',
            NEW.payload->>'paybill'
        );
        
        BEGIN
            payload_date := (NEW.payload->>'timestamp')::timestamp with time zone;
        EXCEPTION WHEN OTHERS THEN
            payload_date := NEW.created_at;
        END;
        
        IF payload_txn_id IS NULL THEN
            RETURN NEW;
        END IF;

        -- 1. Resolve institution
        IF payload_credit_acc IS NOT NULL AND payload_credit_acc <> '' THEN
            SELECT id INTO resolved_inst_id 
            FROM public.institutions 
            WHERE id = payload_credit_acc
               OR institution_code = payload_credit_acc
               OR (mpesa_config->>'paybillNumber') = payload_credit_acc
               OR (mpesa_config->>'paybill_number') = payload_credit_acc
               OR (kcb_config->>'shortCode') = payload_credit_acc
               OR (kcb_config->>'short_code') = payload_credit_acc
               OR (kcb_config->>'tillNumber') = payload_credit_acc
               OR (kcb_config->>'till_number') = payload_credit_acc
               OR (kcb_config->>'companyCode') = payload_credit_acc
               OR (kcb_config->>'company_code') = payload_credit_acc
               OR (kcb_config->>'creditAccountIdentifier') = payload_credit_acc
               OR (kcb_config->>'credit_account_identifier') = payload_credit_acc
               OR (kcb_config->>'accountNumber') = payload_credit_acc
               OR (kcb_config->>'account_number') = payload_credit_acc
               OR (kcb_config->>'bank_account') = payload_credit_acc
               OR (kcb_config->>'bankAccount') = payload_credit_acc
            LIMIT 1;
        END IF;

        -- 2. Try to resolve by organizationShortCode / paybill
        IF resolved_inst_id IS NULL AND payload_shortcode IS NOT NULL AND payload_shortcode <> '' THEN
            SELECT id INTO resolved_inst_id 
            FROM public.institutions 
            WHERE (mpesa_config->>'paybillNumber') = payload_shortcode 
               OR (mpesa_config->>'paybill_number') = payload_shortcode
               OR (kcb_config->>'shortCode') = payload_shortcode
               OR (kcb_config->>'short_code') = payload_shortcode
               OR (kcb_config->>'tillNumber') = payload_shortcode
               OR (kcb_config->>'till_number') = payload_shortcode
               OR (kcb_config->>'companyCode') = payload_shortcode
               OR (kcb_config->>'company_code') = payload_shortcode
               OR (kcb_config->>'organizationShortCode') = payload_shortcode
               OR (kcb_config->>'organization_short_code') = payload_shortcode
            LIMIT 1;
        END IF;

        -- 2.5. Try to resolve from mpesa_transactions if missing info (useful for STK push callbacks)
        IF payload_txn_id IS NOT NULL AND (resolved_inst_id IS NULL OR payload_ref IS NULL OR payload_ref = '') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mpesa_transactions') THEN
                DECLARE
                    mt_inst_id TEXT;
                    mt_ref TEXT;
                BEGIN
                    EXECUTE 'SELECT institution_id, customer_reference FROM public.mpesa_transactions WHERE checkout_request_id = $1 OR transaction_id = $1 LIMIT 1'
                    INTO mt_inst_id, mt_ref
                    USING payload_txn_id;
                    
                    IF mt_inst_id IS NOT NULL AND resolved_inst_id IS NULL THEN
                        resolved_inst_id := mt_inst_id;
                    END IF;
                    IF mt_ref IS NOT NULL AND mt_ref <> '' AND (payload_ref IS NULL OR payload_ref = '') THEN
                        payload_ref := mt_ref;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    -- Ignore errors here
                END;
            END IF;
        END IF;

        -- 3. Try to resolve by matching customerReference
        IF resolved_inst_id IS NULL AND payload_ref IS NOT NULL AND payload_ref <> '' THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'car_sales_invoices') THEN
                EXECUTE 'SELECT institution_id, id FROM public.car_sales_invoices WHERE invoice_number = $1 OR registration_number = $1 LIMIT 1'
                INTO resolved_inst_id, resolved_invoice_id
                USING payload_ref;
            END IF;
            
            IF resolved_inst_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
                EXECUTE 'SELECT institution_id, id FROM public.invoices WHERE invoice_number = $1 LIMIT 1'
                INTO resolved_inst_id, resolved_invoice_id
                USING payload_ref;
            END IF;
            
            IF resolved_inst_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_invoices') THEN
                EXECUTE 'SELECT institution_id, id FROM public.ds_invoices WHERE invoice_number = $1 LIMIT 1'
                INTO resolved_inst_id, resolved_invoice_id
                USING payload_ref;
            END IF;

            IF resolved_inst_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_invoices') THEN
                EXECUTE 'SELECT institution_id, id FROM public.pm_invoices WHERE invoice_number = $1 LIMIT 1'
                INTO resolved_inst_id, resolved_invoice_id
                USING payload_ref;
            END IF;
        END IF;

        -- 4. Try to resolve by student admission number
        IF resolved_inst_id IS NULL AND payload_ref IS NOT NULL AND payload_ref <> '' THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'admission_number') THEN
                EXECUTE 'SELECT institution_id FROM public.users WHERE admission_number = $1 LIMIT 1'
                INTO resolved_inst_id
                USING payload_ref;
            END IF;

            IF resolved_inst_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'metadata') THEN
                EXECUTE 'SELECT institution_id FROM public.users WHERE (metadata->>''admissionNumber'') = $1 LIMIT 1'
                INTO resolved_inst_id
                USING payload_ref;
            END IF;
        END IF;

        -- 5. If resolved_inst_id is known but invoice is not
        IF resolved_inst_id IS NOT NULL AND resolved_invoice_id IS NULL AND payload_ref IS NOT NULL AND payload_ref <> '' THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'car_sales_invoices') THEN
                EXECUTE 'SELECT id FROM public.car_sales_invoices WHERE (invoice_number = $1 OR registration_number = $1) AND institution_id = $2 LIMIT 1' INTO resolved_invoice_id USING payload_ref, resolved_inst_id;
            END IF;
            IF resolved_invoice_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
                EXECUTE 'SELECT id FROM public.invoices WHERE invoice_number = $1 AND institution_id = $2 LIMIT 1' INTO resolved_invoice_id USING payload_ref, resolved_inst_id;
            END IF;
            IF resolved_invoice_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_invoices') THEN
                EXECUTE 'SELECT id FROM public.ds_invoices WHERE invoice_number = $1 AND institution_id = $2 LIMIT 1' INTO resolved_invoice_id USING payload_ref, resolved_inst_id;
            END IF;
            IF resolved_invoice_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_invoices') THEN
                EXECUTE 'SELECT id FROM public.pm_invoices WHERE invoice_number = $1 AND institution_id = $2 LIMIT 1' INTO resolved_invoice_id USING payload_ref, resolved_inst_id;
            END IF;
        END IF;

        -- 6. Upsert to bank_transactions
        IF resolved_inst_id IS NOT NULL THEN
            IF resolved_invoice_id IS NOT NULL THEN
                IF NOT is_reconciled AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'car_sales_invoices') THEN
                    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.car_sales_invoices WHERE id = $1 AND LOWER(status) = ''paid'')' INTO is_reconciled USING resolved_invoice_id;
                END IF;
                IF NOT is_reconciled AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
                    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.invoices WHERE id = $1 AND LOWER(status) = ''paid'')' INTO is_reconciled USING resolved_invoice_id;
                END IF;
                IF NOT is_reconciled AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_invoices') THEN
                    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.ds_invoices WHERE id = $1 AND LOWER(status) = ''paid'')' INTO is_reconciled USING resolved_invoice_id;
                END IF;
                IF NOT is_reconciled AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_invoices') THEN
                    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.pm_invoices WHERE id = $1 AND LOWER(status) = ''paid'')' INTO is_reconciled USING resolved_invoice_id;
                END IF;
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
                linked_invoice_id,
                reconciled_at,
                reconciled_by,
                created_at,
                payload
            ) VALUES (
                payload_txn_id,
                resolved_inst_id,
                COALESCE(payload_amount, 0),
                COALESCE(payload_date, NEW.created_at),
                payload_txn_id,
                COALESCE(payload_sender, 'External Deposit'),
                'KCB',
                CASE WHEN is_reconciled THEN 'reconciled' ELSE 'unreconciled' END,
                resolved_invoice_id,
                CASE WHEN is_reconciled THEN NOW() ELSE NULL END,
                CASE WHEN is_reconciled THEN 'IPN Auto-Match' ELSE NULL END,
                NEW.created_at,
                NEW.payload
            )
            ON CONFLICT (id) DO UPDATE SET
                institution_id = EXCLUDED.institution_id,
                status = EXCLUDED.status,
                linked_invoice_id = COALESCE(bank_transactions.linked_invoice_id, EXCLUDED.linked_invoice_id),
                reconciled_at = COALESCE(bank_transactions.reconciled_at, EXCLUDED.reconciled_at),
                reconciled_by = COALESCE(bank_transactions.reconciled_by, EXCLUDED.reconciled_by),
                payload = EXCLUDED.payload;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS integration_logs_sync_trigger ON public.integration_logs;

-- Create the trigger
CREATE TRIGGER integration_logs_sync_trigger
AFTER INSERT ON public.integration_logs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sync_new_integration_log();
