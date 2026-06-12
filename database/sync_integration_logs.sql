-- SQL script to sync and match bank transactions from integration logs
-- This parses the raw JSON payload in integration_logs and inserts matching records to bank_transactions.
-- Run this in your Supabase SQL editor to create the function, then execute:
-- SELECT public.sync_bank_transactions_from_logs();

CREATE OR REPLACE FUNCTION public.sync_bank_transactions_from_logs()
RETURNS integer AS $$
DECLARE
    log_rec RECORD;
    resolved_inst_id TEXT;
    resolved_invoice_id TEXT;
    payload_ref TEXT;
    payload_amount DECIMAL(12,2);
    payload_date TIMESTAMP WITH TIME ZONE;
    payload_txn_id TEXT;
    payload_sender TEXT;
    payload_credit_acc TEXT;
    payload_shortcode TEXT;
    sync_count integer := 0;
    
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
    resolved_payload jsonb := NULL;
BEGIN
    -- Clean up duplicate records in bank_transactions using mpesa_transactions mappings (pre-run)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mpesa_transactions') THEN
        DELETE FROM public.bank_transactions bt
        USING public.mpesa_transactions mt
        WHERE (bt.id = mt.checkout_request_id OR bt.id = mt.transaction_id)
          AND bt.id <> mt.id
          AND EXISTS (
              SELECT 1 FROM public.bank_transactions bt2 
              WHERE bt2.id = mt.id
          );
    END IF;

    FOR log_rec IN 
        SELECT id, payload, created_at, provider 
        FROM public.integration_logs 
        WHERE (provider LIKE 'kcb%' OR provider = 'kcb_ipn' OR provider = 'kcb_stk_callback' OR provider = 'coop' OR provider = 'coop_b2b') 
          AND payload IS NOT NULL
        ORDER BY created_at ASC
    LOOP
        -- Reset variables
        resolved_inst_id := NULL;
        resolved_invoice_id := NULL;
        resolved_txn_id := NULL;
        resolved_sender_name := NULL;
        mpesa_receipt := NULL;
        stk_amount := NULL;
        stk_phone := NULL;
        stk_date := NULL;
        metadata_items := NULL;
        result_params := NULL;
        payload_receipt_ref := NULL;
        
        -- Parse values from JSON payload dynamically (handles IPN, STK Callbacks, and Sandbox Mocks)
        payload_txn_id := COALESCE(
            log_rec.payload->>'transactionReference',
            log_rec.payload->>'checkoutRequestId',
            log_rec.payload->>'checkoutRequestID',
            log_rec.payload->>'CheckoutRequestID',
            log_rec.payload->>'requestId',
            log_rec.payload->>'transactionId',
            log_rec.payload->>'transactionID',
            log_rec.payload->'Body'->'stkCallback'->>'CheckoutRequestID',
            log_rec.payload->'Body'->'stkCallback'->>'checkoutRequestID',
            log_rec.payload->'Body'->'stkCallback'->>'checkoutRequestId',
            log_rec.payload->'body'->'stkCallback'->>'CheckoutRequestID',
            log_rec.payload->'body'->'stkCallback'->>'checkoutRequestID',
            log_rec.payload->'body'->'stkCallback'->>'checkoutRequestId',
            log_rec.payload->'body'->'stkcallback'->>'checkoutRequestId',
            log_rec.payload->'body'->'stkcallback'->>'checkoutRequestID',
            log_rec.payload->'stkCallback'->>'CheckoutRequestID',
            log_rec.payload->'stkcallback'->>'checkoutRequestId',
            log_rec.payload->'requestPayload'->'primaryData'->>'checkoutRequestID',
            log_rec.payload->'requestPayload'->'primaryData'->>'checkoutRequestId'
        );
        
        payload_ref := COALESCE(
            log_rec.payload->>'customerReference',
            log_rec.payload->>'accountReference',
            log_rec.payload->'requestPayload'->'primaryData'->>'businessKey',
            log_rec.payload->>'businessKey'
        );

        -- Parse Safaricom/KCB STK Push Callback Metadata if present
        BEGIN
            metadata_items := COALESCE(
                log_rec.payload->'Body'->'stkCallback'->'CallbackMetadata'->'Item',
                log_rec.payload->'Body'->'stkCallback'->'callbackMetadata'->'Item',
                log_rec.payload->'body'->'stkCallback'->'CallbackMetadata'->'Item',
                log_rec.payload->'body'->'stkcallback'->'CallbackMetadata'->'Item',
                log_rec.payload->'stkCallback'->'CallbackMetadata'->'Item',
                log_rec.payload->'stkcallback'->'CallbackMetadata'->'Item',
                log_rec.payload->'CallbackMetadata'->'Item',
                log_rec.payload->'callbackMetadata'->'Item',
                log_rec.payload->'Body'->'stkCallback'->'CallbackMetadata'->'item',
                log_rec.payload->'stkCallback'->'CallbackMetadata'->'item',
                log_rec.payload->'CallbackMetadata'->'item',
                log_rec.payload->'callbackMetadata'->'item'
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
                    log_rec.payload->'ResultParameters'->'ResultParameter',
                    log_rec.payload->'Result'->'ResultParameters'->'ResultParameter',
                    log_rec.payload->'Body'->'stkCallback'->'ResultParameters'->'ResultParameter',
                    log_rec.payload->'stkCallback'->'ResultParameters'->'ResultParameter'
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
                log_rec.payload->'requestPayload'->'primaryData'->>'mpesaReceiptNumber',
                log_rec.payload->'requestPayload'->'primaryData'->>'MpesaReceiptNumber',
                log_rec.payload->'requestPayload'->'primaryData'->>'transactionId',
                log_rec.payload->'requestPayload'->'primaryData'->>'businessKey',
                log_rec.payload->>'mpesaReceiptNumber',
                log_rec.payload->>'MpesaReceiptNumber',
                log_rec.payload->>'transactionId',
                log_rec.payload->>'transactionID',
                log_rec.payload->>'businessKey',
                log_rec.payload->>'transactionReference',
                log_rec.payload->>'customerReference'
            );
        END IF;

        -- Protect casting from throwing error on bad formats
        BEGIN
            payload_amount := COALESCE(
                stk_amount,
                (log_rec.payload->>'transactionAmount')::decimal,
                (log_rec.payload->>'amount')::decimal,
                (log_rec.payload->'requestPayload'->'primaryData'->>'transactionAmount')::decimal,
                0.00
            );
        EXCEPTION WHEN OTHERS THEN
            payload_amount := 0.00;
        END;

        payload_sender := COALESCE(
            log_rec.payload->>'customerName',
            log_rec.payload->>'payerName',
            stk_phone,
            log_rec.payload->>'customerMobileNumber',
            log_rec.payload->>'phoneNumber',
            'External Deposit'
        );

        payload_credit_acc := COALESCE(
            log_rec.payload->>'creditAccountIdentifier',
            log_rec.payload->>'institutionId',
            log_rec.payload->>'institution_id'
        );

        payload_shortcode := COALESCE(
            log_rec.payload->>'organizationShortCode',
            log_rec.payload->>'shortCode',
            log_rec.payload->>'short_code',
            log_rec.payload->>'paybill'
        );
        
        -- Handle timestamp parsing
        BEGIN
            IF stk_date IS NOT NULL AND stk_date <> '' THEN
                IF length(stk_date) = 14 THEN
                    payload_date := to_timestamp(stk_date, 'YYYYMMDDHH24MISS');
                ELSE
                    payload_date := stk_date::timestamp with time zone;
                END IF;
            ELSE
                payload_date := (log_rec.payload->>'timestamp')::timestamp with time zone;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            payload_date := log_rec.created_at;
        END;
        
        IF payload_txn_id IS NULL THEN
            CONTINUE;
        END IF;

        -- 1. Try to resolve institution by creditAccountIdentifier matching valid columns/json properties
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

        -- 3. Try to resolve by matching customerReference to invoice number across tables
        IF resolved_inst_id IS NULL AND payload_ref IS NOT NULL AND payload_ref <> '' THEN
            -- Check car_sales_invoices (Automotive Marketplace)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'car_sales_invoices') THEN
                EXECUTE 'SELECT institution_id, id FROM public.car_sales_invoices WHERE invoice_number = $1 LIMIT 1'
                INTO resolved_inst_id, resolved_invoice_id
                USING payload_ref;
            END IF;
            
            -- Check regular invoices (Academic)
            IF resolved_inst_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
                EXECUTE 'SELECT institution_id, id FROM public.invoices WHERE invoice_number = $1 LIMIT 1'
                INTO resolved_inst_id, resolved_invoice_id
                USING payload_ref;
            END IF;
            
            -- Check ds_invoices (Driving School)
            IF resolved_inst_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_invoices') THEN
                EXECUTE 'SELECT institution_id, id FROM public.ds_invoices WHERE invoice_number = $1 LIMIT 1'
                INTO resolved_inst_id, resolved_invoice_id
                USING payload_ref;
            END IF;

            -- Check pm_invoices (Property Management)
            IF resolved_inst_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_invoices') THEN
                EXECUTE 'SELECT institution_id, id FROM public.pm_invoices WHERE invoice_number = $1 LIMIT 1'
                INTO resolved_inst_id, resolved_invoice_id
                USING payload_ref;
            END IF;
        END IF;

        -- 4. Try to resolve by matching student admission number in users table (e.g. from customerReference suffix/prefix)
        IF resolved_inst_id IS NULL AND payload_ref IS NOT NULL AND payload_ref <> '' THEN
            -- Check if column admission_number exists in public.users
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                  AND table_name = 'users' 
                  AND column_name = 'admission_number'
            ) THEN
                EXECUTE 'SELECT institution_id FROM public.users WHERE admission_number = $1 LIMIT 1'
                INTO resolved_inst_id
                USING payload_ref;
            END IF;

            -- Check if column metadata exists in public.users
            IF resolved_inst_id IS NULL AND EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                  AND table_name = 'users' 
                  AND column_name = 'metadata'
            ) THEN
                EXECUTE 'SELECT institution_id FROM public.users WHERE (metadata->>''admissionNumber'') = $1 LIMIT 1'
                INTO resolved_inst_id
                USING payload_ref;
            END IF;
            
            -- Split check for customerReference like "8094160-100" -> "8094160"
            IF resolved_inst_id IS NULL THEN
                DECLARE
                    ref_part TEXT;
                BEGIN
                    ref_part := split_part(payload_ref, '-', 1);
                    IF ref_part IS NOT NULL AND ref_part <> '' THEN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                              AND table_name = 'users' 
                              AND column_name = 'admission_number'
                        ) THEN
                            EXECUTE 'SELECT institution_id FROM public.users WHERE admission_number = $1 LIMIT 1'
                            INTO resolved_inst_id
                            USING ref_part;
                        END IF;

                        IF resolved_inst_id IS NULL AND EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                              AND table_name = 'users' 
                              AND column_name = 'metadata'
                        ) THEN
                            EXECUTE 'SELECT institution_id FROM public.users WHERE (metadata->>''admissionNumber'') = $1 LIMIT 1'
                            INTO resolved_inst_id
                            USING ref_part;
                        END IF;
                    END IF;
                    
                    IF resolved_inst_id IS NULL THEN
                        ref_part := split_part(payload_ref, '/', 1);
                        IF ref_part IS NOT NULL AND ref_part <> '' THEN
                            IF EXISTS (
                                SELECT 1 FROM information_schema.columns 
                                WHERE table_schema = 'public' 
                                  AND table_name = 'users' 
                                  AND column_name = 'admission_number'
                            ) THEN
                                EXECUTE 'SELECT institution_id FROM public.users WHERE admission_number = $1 LIMIT 1'
                                INTO resolved_inst_id
                                USING ref_part;
                            END IF;

                            IF resolved_inst_id IS NULL AND EXISTS (
                                SELECT 1 FROM information_schema.columns 
                                WHERE table_schema = 'public' 
                                  AND table_name = 'users' 
                                  AND column_name = 'metadata'
                            ) THEN
                                EXECUTE 'SELECT institution_id FROM public.users WHERE (metadata->>''admissionNumber'') = $1 LIMIT 1'
                                INTO resolved_inst_id
                                USING ref_part;
                            END IF;
                        END IF;
                    END IF;
                END;
            END IF;
        END IF;

        -- 5. If resolved_inst_id is known but resolved_invoice_id is not, try to find invoice by customerReference
        IF resolved_inst_id IS NOT NULL AND resolved_invoice_id IS NULL AND payload_ref IS NOT NULL AND payload_ref <> '' THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'car_sales_invoices') THEN
                EXECUTE 'SELECT id FROM public.car_sales_invoices WHERE invoice_number = $1 AND institution_id = $2 LIMIT 1' INTO resolved_invoice_id USING payload_ref, resolved_inst_id;
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

            -- Try prefix matching if not found directly
            IF resolved_invoice_id IS NULL THEN
                DECLARE
                    ref_part TEXT;
                BEGIN
                    ref_part := split_part(payload_ref, '-', 1);
                    IF ref_part IS NOT NULL AND ref_part <> '' THEN
                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'car_sales_invoices') THEN
                            EXECUTE 'SELECT id FROM public.car_sales_invoices WHERE invoice_number = $1 AND institution_id = $2 LIMIT 1' INTO resolved_invoice_id USING ref_part, resolved_inst_id;
                        END IF;
                        IF resolved_invoice_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
                            EXECUTE 'SELECT id FROM public.invoices WHERE invoice_number = $1 AND institution_id = $2 LIMIT 1' INTO resolved_invoice_id USING ref_part, resolved_inst_id;
                        END IF;
                        IF resolved_invoice_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_invoices') THEN
                            EXECUTE 'SELECT id FROM public.ds_invoices WHERE invoice_number = $1 AND institution_id = $2 LIMIT 1' INTO resolved_invoice_id USING ref_part, resolved_inst_id;
                        END IF;
                        IF resolved_invoice_id IS NULL AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_invoices') THEN
                            EXECUTE 'SELECT id FROM public.pm_invoices WHERE invoice_number = $1 AND institution_id = $2 LIMIT 1' INTO resolved_invoice_id USING ref_part, resolved_inst_id;
                        END IF;
                    END IF;
                END;
            END IF;
        END IF;

        -- 6. If we successfully resolved the institution_id, upsert to bank_transactions
        IF resolved_inst_id IS NOT NULL THEN
            -- Check if invoice exists and has been reconciled/paid
            DECLARE
                is_reconciled boolean := false;
            BEGIN
                IF resolved_invoice_id IS NOT NULL THEN
                    IF NOT is_reconciled AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'car_sales_invoices') THEN
                        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.car_sales_invoices WHERE id = $1 AND LOWER(status) = ''paid'')'
                        INTO is_reconciled
                        USING resolved_invoice_id;
                    END IF;
                    
                    IF NOT is_reconciled AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
                        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.invoices WHERE id = $1 AND LOWER(status) = ''paid'')'
                        INTO is_reconciled
                        USING resolved_invoice_id;
                    END IF;
                    
                    IF NOT is_reconciled AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_invoices') THEN
                        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.ds_invoices WHERE id = $1 AND LOWER(status) = ''paid'')'
                        INTO is_reconciled
                        USING resolved_invoice_id;
                    END IF;

                    IF NOT is_reconciled AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pm_invoices') THEN
                        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.pm_invoices WHERE id = $1 AND LOWER(status) = ''paid'')'
                        INTO is_reconciled
                        USING resolved_invoice_id;
                    END IF;
                END IF;

                IF resolved_txn_id IS NOT NULL THEN
                    -- Delete duplicate temporary rows that might have been created under the checkoutRequestId or mpesaReceiptNumber
                    DELETE FROM public.bank_transactions 
                    WHERE (id = payload_txn_id AND id <> resolved_txn_id)
                       OR (id = mpesa_receipt AND id <> resolved_txn_id)
                       OR (id = payload_receipt_ref AND id <> resolved_txn_id);
                END IF;

                resolved_payload := COALESCE(log_rec.payload, '{}'::jsonb);
                IF payload_amount > 0 THEN
                    resolved_payload := jsonb_set(resolved_payload, '{amount}', to_jsonb(payload_amount));
                    resolved_payload := jsonb_set(resolved_payload, '{transactionAmount}', to_jsonb(payload_amount));
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
                    COALESCE(payload_date, log_rec.created_at),
                    payload_receipt_ref,
                    COALESCE(payload_sender, 'External Deposit'),
                    'KCB',
                    CASE WHEN is_reconciled THEN 'reconciled' ELSE 'unreconciled' END,
                    resolved_invoice_id,
                    CASE WHEN is_reconciled THEN NOW() ELSE NULL END,
                    CASE WHEN is_reconciled THEN 'Log Sync Utility' ELSE NULL END,
                    log_rec.created_at,
                    resolved_payload
                )
                ON CONFLICT (id) DO UPDATE SET
                    institution_id = EXCLUDED.institution_id,
                    status = EXCLUDED.status,
                    linked_invoice_id = COALESCE(bank_transactions.linked_invoice_id, EXCLUDED.linked_invoice_id),
                    reconciled_at = COALESCE(bank_transactions.reconciled_at, EXCLUDED.reconciled_at),
                    reconciled_by = COALESCE(bank_transactions.reconciled_by, EXCLUDED.reconciled_by),
                    payload = EXCLUDED.payload;
                
                sync_count := sync_count + 1;
            END;
        END IF;
    END LOOP;
    
    -- Clean up duplicate records in bank_transactions using mpesa_transactions mappings (post-run)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mpesa_transactions') THEN
        DELETE FROM public.bank_transactions bt
        USING public.mpesa_transactions mt
        WHERE (bt.id = mt.checkout_request_id OR bt.id = mt.transaction_id)
          AND bt.id <> mt.id
          AND EXISTS (
              SELECT 1 FROM public.bank_transactions bt2 
              WHERE bt2.id = mt.id
          );
    END IF;

    RETURN sync_count;
END;
$$ LANGUAGE plpgsql;
