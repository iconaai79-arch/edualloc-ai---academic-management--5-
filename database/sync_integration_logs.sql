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
BEGIN
    FOR log_rec IN 
        SELECT id, payload, created_at, provider 
        FROM public.integration_logs 
        WHERE (provider LIKE 'kcb%' OR provider = 'kcb_ipn' OR provider = 'kcb_stk_callback') 
          AND payload IS NOT NULL
    LOOP
        -- Reset variables
        resolved_inst_id := NULL;
        resolved_invoice_id := NULL;
        
        -- Parse values from JSON payload dynamically (handles IPN, STK Callbacks, and Sandbox Mocks)
        payload_txn_id := COALESCE(
            log_rec.payload->>'transactionReference',
            log_rec.payload->>'checkoutRequestId',
            log_rec.payload->>'checkoutRequestID',
            log_rec.payload->>'requestId',
            log_rec.payload->>'transactionId',
            log_rec.payload->>'transactionID',
            log_rec.payload->'Body'->'stkCallback'->>'CheckoutRequestID',
            log_rec.payload->'requestPayload'->'primaryData'->>'checkoutRequestID'
        );
        
        payload_ref := COALESCE(
            log_rec.payload->>'customerReference',
            log_rec.payload->>'accountReference',
            log_rec.payload->'requestPayload'->'primaryData'->>'businessKey',
            log_rec.payload->>'businessKey'
        );

        -- Protect casting from throwing error on bad formats
        BEGIN
            payload_amount := COALESCE(
                (log_rec.payload->>'transactionAmount')::decimal,
                (log_rec.payload->>'amount')::decimal,
                0.00
            );
        EXCEPTION WHEN OTHERS THEN
            payload_amount := 0.00;
        END;

        payload_sender := COALESCE(
            log_rec.payload->>'customerName',
            log_rec.payload->>'payerName',
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
            payload_date := (log_rec.payload->>'timestamp')::timestamp with time zone;
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
               OR (kcb_config->>'tillNumber') = payload_credit_acc
               OR (kcb_config->>'companyCode') = payload_credit_acc
               OR (kcb_config->>'creditAccountIdentifier') = payload_credit_acc
               OR (kcb_config->>'accountNumber') = payload_credit_acc
               OR (kcb_config->>'bank_account') = payload_credit_acc
            LIMIT 1;
        END IF;

        -- 2. Try to resolve by organizationShortCode / paybill
        IF resolved_inst_id IS NULL AND payload_shortcode IS NOT NULL AND payload_shortcode <> '' THEN
            SELECT id INTO resolved_inst_id 
            FROM public.institutions 
            WHERE (mpesa_config->>'paybillNumber') = payload_shortcode 
               OR (mpesa_config->>'paybill_number') = payload_shortcode
               OR (kcb_config->>'shortCode') = payload_shortcode
               OR (kcb_config->>'tillNumber') = payload_shortcode
               OR (kcb_config->>'companyCode') = payload_shortcode
            LIMIT 1;
        END IF;

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
                    COALESCE(payload_date, log_rec.created_at),
                    payload_txn_id,
                    COALESCE(payload_sender, 'External Deposit'),
                    'KCB',
                    CASE WHEN is_reconciled THEN 'reconciled' ELSE 'unreconciled' END,
                    resolved_invoice_id,
                    CASE WHEN is_reconciled THEN NOW() ELSE NULL END,
                    CASE WHEN is_reconciled THEN 'Log Sync Utility' ELSE NULL END,
                    log_rec.created_at,
                    log_rec.payload
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
    
    RETURN sync_count;
END;
$$ LANGUAGE plpgsql;
