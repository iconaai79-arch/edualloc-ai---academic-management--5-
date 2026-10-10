-- Migration: Fix receipt references to display real M-Pesa / Bank transaction codes
-- Path: database/migrations/464_fix_receipt_reference_mpesa_code.sql
-- Description: Replaces synthetic txn_ timestamps in receipts.related_transaction_id 
-- with authentic M-Pesa / Bank provider codes (e.g., FT262834RGCD, UJ1F48QRBS).

DO $$
BEGIN
    -- 1. Match from bank_transactions by exact id
    UPDATE public.receipts r
    SET related_transaction_id = bt.reference
    FROM public.bank_transactions bt
    WHERE (r.related_transaction_id = bt.id OR r.related_transaction_id = ('txn_' || bt.id))
      AND (r.related_transaction_id LIKE 'txn_%' OR r.related_transaction_id ~ '^txn_[0-9]+$')
      AND bt.reference IS NOT NULL
      AND TRIM(bt.reference) <> ''
      AND bt.reference !~* '^(txn_|kcb_ipn_|mpesa_|sim_|test_|rec_|[0-9]{10,20}$)';

    -- 2. Match from mpesa_transactions by id or checkout_request_id
    UPDATE public.receipts r
    SET related_transaction_id = mt.transaction_id
    FROM public.mpesa_transactions mt
    WHERE (r.related_transaction_id = mt.id OR r.related_transaction_id = mt.checkout_request_id)
      AND (r.related_transaction_id LIKE 'txn_%' OR r.related_transaction_id ~ '^txn_[0-9]+$')
      AND mt.transaction_id IS NOT NULL
      AND TRIM(mt.transaction_id) <> ''
      AND mt.transaction_id !~* '^(txn_|kcb_ipn_|mpesa_|sim_|test_|rec_|[0-9]{10,20}$)';

    -- 3. Match from bank_feed_transactions if the table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_feed_transactions') THEN
        EXECUTE '
            UPDATE public.receipts r
            SET related_transaction_id = bft.reference
            FROM public.bank_feed_transactions bft
            WHERE (r.related_transaction_id = bft.id::text OR r.related_transaction_id = (''txn_'' || bft.id::text))
              AND (r.related_transaction_id LIKE ''txn_%'' OR r.related_transaction_id ~ ''^txn_[0-9]+$'')
              AND bft.reference IS NOT NULL
              AND TRIM(bft.reference) <> ''''
              AND bft.reference !~* ''^(txn_|kcb_ipn_|mpesa_|sim_|test_|rec_|[0-9]{10,20}$)'';
        ';
    END IF;

    -- 4. Extract real reference from remarks if remarks has "(Ref: CODE)" or "Ref: CODE"
    UPDATE public.receipts
    SET related_transaction_id = (regexp_match(remarks, 'Ref:\s*([A-Za-z0-9]{6,25})'))[1]
    WHERE (related_transaction_id LIKE 'txn_%' OR related_transaction_id ~ '^txn_[0-9]+$' OR related_transaction_id IS NULL)
      AND remarks ~* 'Ref:\s*([A-Za-z0-9]{6,25})'
      AND (regexp_match(remarks, 'Ref:\s*([A-Za-z0-9]{6,25})'))[1] !~* '^(txn_|kcb_ipn_|mpesa_|sim_|test_|rec_|[0-9]{10,20}$)';

    RAISE NOTICE 'Completed migration 464_fix_receipt_reference_mpesa_code successfully';
END $$;
