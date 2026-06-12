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
    
    -- STK push callback parsing helpers
    temp_item jsonb;
    mpesa_receipt text := NULL;
    stk_amount decimal(12,2) := NULL;
    stk_phone text := NULL;
    stk_date text := NULL;
    metadata_items jsonb := NULL;
    resolved_txn_id text := NULL;
    resolved_sender_name text := NULL;
    payload_receipt_ref text := NULL;
BEGIN
    -- Only process specific providers that have a payload and status 'received'
    IF NEW.provider IN ('kcb_ipn', 'kcb_stk_callback', 'coop') AND LOWER(NEW.status) = 'received' AND NEW.payload IS NOT NULL THEN
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

        -- Parse Safaricom/KCB STK Push Callback Metadata if present
        BEGIN
            metadata_items := COALESCE(
                NEW.payload->'Body'->'stkCallback'->'CallbackMetadata'->'Item',
                NEW.payload->'CallbackMetadata'->'Item',
                NEW.payload->'stkCallback'->'CallbackMetadata'->'Item'
            );
            
            IF metadata_items IS NOT NULL AND jsonb_typeof(metadata_items) = 'array' THEN
                FOR temp_item IN SELECT * FROM jsonb_array_elements(metadata_items) LOOP
                    IF temp_item->>'Name' = 'MpesaReceiptNumber' THEN
                        mpesa_receipt := temp_item->>'Value';
                    ELSIF temp_item->>'Name' = 'Amount' THEN
                        stk_amount := (temp_item->>'Value')::decimal;
                    ELSIF temp_item->>'Name' = 'PhoneNumber' THEN
                        stk_phone := temp_item->>'Value';
                    ELSIF temp_item->>'Name' = 'TransactionDate' THEN
                        stk_date := temp_item->>'Value';
                    END IF;
                END LOOP;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore metadata extraction errors
        END;

        BEGIN
            payload_amount := COALESCE(
                stk_amount,
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
            stk_phone,
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
        
        resolved_invoice_id := COALESCE(
            NEW.payload->>'invoice_id',
            NEW.payload->>'invoiceId',
            NEW.payload->>'linked_invoice_id'
        );
        
        BEGIN
            IF stk_date IS NOT NULL AND stk_date <> '' THEN
                IF length(stk_date) = 14 THEN
                    payload_date := to_timestamp(stk_date, 'YYYYMMDDHH24MISS');
                ELSE
                    payload_date := stk_date::timestamp with time zone;
                END IF;
            ELSE
                payload_date := (NEW.payload->>'timestamp')::timestamp with time zone;
            END IF;
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
        IF payload_txn_id IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mpesa_transactions') THEN
                DECLARE
                    mt_id TEXT;
                    mt_inst_id TEXT;
                    mt_ref TEXT;
                    mt_payer_name TEXT;
                BEGIN
                    EXECUTE 'SELECT id, institution_id, customer_reference, payer_name FROM public.mpesa_transactions WHERE checkout_request_id = $1 OR transaction_id = $1 LIMIT 1'
                    INTO mt_id, mt_inst_id, mt_ref, mt_payer_name
                    USING payload_txn_id;
                    
                    IF mt_id IS NOT NULL THEN
                        resolved_txn_id := mt_id;
                    END IF;
                    IF mt_inst_id IS NOT NULL AND resolved_inst_id IS NULL THEN
                        resolved_inst_id := mt_inst_id;
                    END IF;
                    IF mt_ref IS NOT NULL AND mt_ref <> '' AND (payload_ref IS NULL OR payload_ref = '') THEN
                        payload_ref := mt_ref;
                    END IF;
                    IF mt_payer_name IS NOT NULL AND mt_payer_name <> '' THEN
                        resolved_sender_name := mt_payer_name;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    -- Ignore errors here
                END;
            END IF;
        END IF;

        -- Final resolution of ID, reference, and sender name
        resolved_txn_id := COALESCE(resolved_txn_id, mpesa_receipt, payload_txn_id);
        payload_receipt_ref := COALESCE(mpesa_receipt, payload_ref, payload_txn_id);
        payload_sender := COALESCE(resolved_sender_name, payload_sender);

        -- 2.6. If we have a resolved_invoice_id from the payload, try to find the institution
        IF resolved_invoice_id IS NOT NULL AND resolved_inst_id IS NULL THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
                EXECUTE 'SELECT institution_id FROM public.invoices WHERE id = $1 LIMIT 1' INTO resolved_inst_id USING resolved_invoice_id;
            END IF;
            IF resolved_inst_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'car_sales_invoices') THEN
                EXECUTE 'SELECT institution_id FROM public.car_sales_invoices WHERE id = $1 LIMIT 1' INTO resolved_inst_id USING resolved_invoice_id;
            END IF;
            IF resolved_inst_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_invoices') THEN
                EXECUTE 'SELECT institution_id FROM public.ds_invoices WHERE id = $1 LIMIT 1' INTO resolved_inst_id USING resolved_invoice_id;
            END IF;
            IF resolved_inst_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_invoices') THEN
                EXECUTE 'SELECT institution_id FROM public.pm_invoices WHERE id = $1 LIMIT 1' INTO resolved_inst_id USING resolved_invoice_id;
            END IF;
        END IF;

        -- 3. Try to resolve by matching customerReference
        IF payload_ref IS NOT NULL AND payload_ref <> '' THEN
            IF resolved_invoice_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'car_sales_invoices') THEN
                EXECUTE 'SELECT institution_id, id FROM public.car_sales_invoices WHERE invoice_number = $1 OR registration_number = $1 LIMIT 1'
                INTO resolved_inst_id, resolved_invoice_id
                USING payload_ref;
            END IF;
            
            IF resolved_invoice_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
                EXECUTE 'SELECT institution_id, id FROM public.invoices WHERE invoice_number = $1 LIMIT 1'
                INTO resolved_inst_id, resolved_invoice_id
                USING payload_ref;
            END IF;
            
            IF resolved_invoice_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_invoices') THEN
                EXECUTE 'SELECT institution_id, id FROM public.ds_invoices WHERE invoice_number = $1 LIMIT 1'
                INTO resolved_inst_id, resolved_invoice_id
                USING payload_ref;
            END IF;

            IF resolved_invoice_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_invoices') THEN
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

            IF resolved_txn_id <> payload_txn_id THEN
                DELETE FROM public.bank_transactions WHERE id = payload_txn_id;
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
                resolved_txn_id,
                resolved_inst_id,
                COALESCE(payload_amount, 0),
                COALESCE(payload_date, NEW.created_at),
                payload_receipt_ref,
                COALESCE(payload_sender, 'External Deposit'),
                CASE WHEN NEW.provider = 'coop' THEN 'Co-op Bank' ELSE 'KCB' END,
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
