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
    result_params jsonb := NULL;
    resolved_txn_id text := NULL;
    resolved_sender_name text := NULL;
    payload_receipt_ref text := NULL;
BEGIN
    -- Only process specific providers that have a payload and status 'received'
    IF NEW.provider IN ('kcb_ipn', 'kcb_stk_callback', 'coop_b2b', 'coop', 'kcb') AND LOWER(NEW.status) = 'received' AND NEW.payload IS NOT NULL THEN
        -- Parse values from JSON payload dynamically
        payload_txn_id := COALESCE(
            NEW.payload->>'transactionReference',
            NEW.payload->>'checkoutRequestId',
            NEW.payload->>'checkoutRequestID',
            NEW.payload->>'CheckoutRequestID',
            NEW.payload->>'requestId',
            NEW.payload->>'transactionId',
            NEW.payload->>'transactionID',
            NEW.payload->'Body'->'stkCallback'->>'CheckoutRequestID',
            NEW.payload->'Body'->'stkCallback'->>'checkoutRequestID',
            NEW.payload->'Body'->'stkCallback'->>'checkoutRequestId',
            NEW.payload->'body'->'stkCallback'->>'CheckoutRequestID',
            NEW.payload->'body'->'stkCallback'->>'checkoutRequestID',
            NEW.payload->'body'->'stkCallback'->>'checkoutRequestId',
            NEW.payload->'body'->'stkcallback'->>'checkoutRequestId',
            NEW.payload->'body'->'stkcallback'->>'checkoutRequestID',
            NEW.payload->'stkCallback'->>'CheckoutRequestID',
            NEW.payload->'stkcallback'->>'checkoutRequestId',
            NEW.payload->'requestPayload'->'primaryData'->>'checkoutRequestID',
            NEW.payload->'requestPayload'->'primaryData'->>'checkoutRequestId'
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
                NEW.payload->'Body'->'stkCallback'->'callbackMetadata'->'Item',
                NEW.payload->'body'->'stkCallback'->'CallbackMetadata'->'Item',
                NEW.payload->'body'->'stkcallback'->'CallbackMetadata'->'Item',
                NEW.payload->'stkCallback'->'CallbackMetadata'->'Item',
                NEW.payload->'stkcallback'->'CallbackMetadata'->'Item',
                NEW.payload->'CallbackMetadata'->'Item',
                NEW.payload->'callbackMetadata'->'Item',
                NEW.payload->'Body'->'stkCallback'->'CallbackMetadata'->'item',
                NEW.payload->'stkCallback'->'CallbackMetadata'->'item',
                NEW.payload->'CallbackMetadata'->'item',
                NEW.payload->'callbackMetadata'->'item'
            );
            
            IF metadata_items IS NOT NULL AND jsonb_typeof(metadata_items) = 'array' THEN
                FOR temp_item IN SELECT * FROM jsonb_array_elements(metadata_items) LOOP
                    IF LOWER(temp_item->>'Name') = 'mpesareceiptnumber' OR LOWER(temp_item->>'Key') = 'mpesareceiptnumber' THEN
                        mpesa_receipt := temp_item->>'Value';
                    ELSIF LOWER(temp_item->>'Name') = 'amount' OR LOWER(temp_item->>'Key') = 'amount' THEN
                        stk_amount := (temp_item->>'Value')::decimal;
                    ELSIF LOWER(temp_item->>'Name') = 'phonenumber' OR LOWER(temp_item->>'Key') = 'phonenumber' THEN
                        stk_phone := temp_item->>'Value';
                    ELSIF LOWER(temp_item->>'Name') = 'transactiondate' OR LOWER(temp_item->>'Key') = 'transactiondate' THEN
                        stk_date := temp_item->>'Value';
                    END IF;
                END LOOP;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore metadata extraction errors
        END;

        -- If not found, parse ResultParameters.ResultParameter (KCB Buni format)
        IF mpesa_receipt IS NULL OR mpesa_receipt = '' THEN
            BEGIN
                result_params := COALESCE(
                    NEW.payload->'ResultParameters'->'ResultParameter',
                    NEW.payload->'Result'->'ResultParameters'->'ResultParameter',
                    NEW.payload->'Body'->'stkCallback'->'ResultParameters'->'ResultParameter',
                    NEW.payload->'stkCallback'->'ResultParameters'->'ResultParameter'
                );
                
                IF result_params IS NOT NULL THEN
                    IF jsonb_typeof(result_params) = 'array' THEN
                        FOR temp_item IN SELECT * FROM jsonb_array_elements(result_params) LOOP
                            IF LOWER(temp_item->>'Key') IN ('mpesareceiptnumber', 'transactionid', 'mpesaref') OR LOWER(temp_item->>'Name') IN ('mpesareceiptnumber', 'transactionid', 'mpesaref') THEN
                                mpesa_receipt := temp_item->>'Value';
                            ELSIF LOWER(temp_item->>'Key') = 'amount' OR LOWER(temp_item->>'Name') = 'amount' THEN
                                stk_amount := (temp_item->>'Value')::decimal;
                            ELSIF LOWER(temp_item->>'Key') = 'phonenumber' OR LOWER(temp_item->>'Name') = 'phonenumber' THEN
                                stk_phone := temp_item->>'Value';
                            ELSIF LOWER(temp_item->>'Key') = 'transactiondate' OR LOWER(temp_item->>'Name') = 'transactiondate' THEN
                                stk_date := temp_item->>'Value';
                            END IF;
                        END LOOP;
                    ELSE
                        IF LOWER(result_params->>'Key') IN ('mpesareceiptnumber', 'transactionid', 'mpesaref') OR LOWER(result_params->>'Name') IN ('mpesareceiptnumber', 'transactionid', 'mpesaref') THEN
                            mpesa_receipt := result_params->>'Value';
                        ELSIF LOWER(result_params->>'Key') = 'amount' OR LOWER(result_params->>'Name') = 'amount' THEN
                            stk_amount := (result_params->>'Value')::decimal;
                        ELSIF LOWER(result_params->>'Key') = 'phonenumber' OR LOWER(result_params->>'Name') = 'phonenumber' THEN
                            stk_phone := result_params->>'Value';
                        ELSIF LOWER(result_params->>'Key') = 'transactiondate' OR LOWER(result_params->>'Name') = 'transactiondate' THEN
                            stk_date := result_params->>'Value';
                        END IF;
                    END IF;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Ignore result parameter extraction errors
            END;
        END IF;

        -- Check flat keys
        IF mpesa_receipt IS NULL OR mpesa_receipt = '' THEN
            mpesa_receipt := COALESCE(
                NEW.payload->'requestPayload'->'primaryData'->>'mpesaReceiptNumber',
                NEW.payload->'requestPayload'->'primaryData'->>'MpesaReceiptNumber',
                NEW.payload->'requestPayload'->'primaryData'->>'transactionId',
                NEW.payload->'requestPayload'->'primaryData'->>'businessKey',
                NEW.payload->>'mpesaReceiptNumber',
                NEW.payload->>'MpesaReceiptNumber',
                NEW.payload->>'transactionId',
                NEW.payload->>'transactionID',
                NEW.payload->>'businessKey',
                NEW.payload->>'transactionReference',
                NEW.payload->>'customerReference'
            );
        END IF;

        BEGIN
            payload_amount := COALESCE(
                stk_amount,
                (NEW.payload->>'transactionAmount')::decimal,
                (NEW.payload->>'amount')::decimal,
                (NEW.payload->'requestPayload'->'primaryData'->>'transactionAmount')::decimal,
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
                    mt_amount DECIMAL(12,2);
                BEGIN
                    IF payload_ref IS NOT NULL AND payload_ref <> '' AND payload_amount > 0 THEN
                        EXECUTE 'SELECT id, institution_id, customer_reference, payer_name, amount FROM public.mpesa_transactions WHERE checkout_request_id = $1 OR transaction_id = $1 OR (customer_reference = $2 AND amount = $3) LIMIT 1'
                        INTO mt_id, mt_inst_id, mt_ref, mt_payer_name, mt_amount
                        USING payload_txn_id, payload_ref, payload_amount;
                    ELSE
                        EXECUTE 'SELECT id, institution_id, customer_reference, payer_name, amount FROM public.mpesa_transactions WHERE checkout_request_id = $1 OR transaction_id = $1 LIMIT 1'
                        INTO mt_id, mt_inst_id, mt_ref, mt_payer_name, mt_amount
                        USING payload_txn_id;
                    END IF;
                    
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
                    IF mt_amount IS NOT NULL AND mt_amount > 0 AND (payload_amount IS NULL OR payload_amount = 0) THEN
                        payload_amount := mt_amount;
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

        -- Inject verified amount into raw payload to guarantee it is always present
        IF payload_amount > 0 THEN
            NEW.payload := jsonb_set(COALESCE(NEW.payload, ''{}''::jsonb), ''{amount}'', to_jsonb(payload_amount));
            NEW.payload := jsonb_set(NEW.payload, ''{transactionAmount}'', to_jsonb(payload_amount));
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

            IF resolved_txn_id IS NOT NULL THEN
                -- Delete duplicate temporary rows that might have been created under the checkoutRequestId or mpesaReceiptNumber
                DELETE FROM public.bank_transactions 
                WHERE (id = payload_txn_id AND id <> resolved_txn_id)
                   OR (id = mpesa_receipt AND id <> resolved_txn_id)
                   OR (id = payload_receipt_ref AND id <> resolved_txn_id);
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
