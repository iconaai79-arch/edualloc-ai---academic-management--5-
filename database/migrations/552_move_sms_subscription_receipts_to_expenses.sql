-- ============================================================================
-- MIGRATION 552: MOVE MISCLASSIFIED SMS TOP-UP & SUBSCRIPTION RECEIPTS TO EXPENSES
-- Schema-safe & Idempotent: Auto-ensures columns on public.expenses and reads
-- optional columns via to_jsonb() so it works on any Talksasa/PostgreSQL schema.
-- ============================================================================

DO $$
DECLARE
    v_moved_count INTEGER := 0;
    v_deleted_rec INTEGER := 0;
    v_deleted_inv INTEGER := 0;
BEGIN
    -- 0. Ensure required columns exist on public.expenses before inserting
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS category TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS expense_date DATE DEFAULT CURRENT_DATE;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_method TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS reference_number TEXT;
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Approved';
        ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipts') THEN
        -- 1. Backfill misclassified SMS / Subscription receipts into public.expenses
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
            INSERT INTO public.expenses (
                id, institution_id, category, description, amount, expense_date,
                payment_method, reference_number, status, created_at
            )
            SELECT
                'exp_mig_' || r.id::text,
                COALESCE(to_jsonb(r.*)->>'institution_id', to_jsonb(r.*)->>'institutionId'),
                CASE
                    WHEN LOWER(
                        COALESCE(r.id::text, '') || ' ' ||
                        COALESCE(to_jsonb(r.*)->>'receipt_number', to_jsonb(r.*)->>'receiptNumber', '') || ' ' ||
                        COALESCE(to_jsonb(r.*)->>'paid_for', to_jsonb(r.*)->>'paidFor', '') || ' ' ||
                        COALESCE((to_jsonb(i.*)->'items')::text, '')
                    ) LIKE '%sms%'
                        THEN 'SMS & Communications'
                    ELSE 'Software & Subscriptions'
                END,
                COALESCE(
                    NULLIF(TRIM(COALESCE(to_jsonb(r.*)->>'paid_for', to_jsonb(r.*)->>'paidFor', '')), ''),
                    NULLIF(TRIM(COALESCE(to_jsonb(i.*)->'items'->0->>'description', '')), ''),
                    'Platform SMS / Subscription Purchase'
                ),
                COALESCE(NULLIF(COALESCE(to_jsonb(r.*)->>'amount_paid', to_jsonb(r.*)->>'amountPaid', to_jsonb(r.*)->>'amount'), '')::numeric, 0),
                COALESCE(NULLIF(COALESCE(to_jsonb(r.*)->>'payment_date', to_jsonb(r.*)->>'paymentDate'), '')::date, CURRENT_DATE),
                COALESCE(NULLIF(COALESCE(to_jsonb(r.*)->>'payment_method', to_jsonb(r.*)->>'paymentMethod'), ''), 'M-Pesa'),
                COALESCE(
                    NULLIF(COALESCE(to_jsonb(r.*)->>'related_transaction_id', to_jsonb(r.*)->>'relatedTransactionId'), ''),
                    NULLIF(COALESCE(to_jsonb(r.*)->>'receipt_number', to_jsonb(r.*)->>'receiptNumber'), ''),
                    r.id::text
                ),
                'Approved',
                COALESCE(NULLIF(COALESCE(to_jsonb(r.*)->>'created_at', to_jsonb(r.*)->>'createdAt'), '')::timestamptz, NOW())
            FROM public.receipts r
            LEFT JOIN public.invoices i
                ON i.id::text = COALESCE(to_jsonb(r.*)->>'invoice_id', to_jsonb(r.*)->>'invoiceId', '')
            WHERE COALESCE(to_jsonb(r.*)->>'institution_id', to_jsonb(r.*)->>'institutionId', '') NOT IN ('', 'GLOBAL', 'SYSTEM')
              AND (
                  r.id::text LIKE 'rec_sms_%'
                  OR r.id::text LIKE 'rec_sub_%'
                  OR UPPER(COALESCE(to_jsonb(r.*)->>'receipt_number', to_jsonb(r.*)->>'receiptNumber', '')) LIKE '%SMS-%'
                  OR UPPER(COALESCE(to_jsonb(r.*)->>'receipt_number', to_jsonb(r.*)->>'receiptNumber', '')) LIKE '%SUB-%'
                  OR LOWER(COALESCE(to_jsonb(r.*)->>'paid_for', to_jsonb(r.*)->>'paidFor', '')) ~ 'sms\s*top[\s-]*up|sms\s*units|subscription|platform\s*license'
                  OR (
                      COALESCE(to_jsonb(r.*)->>'student_id', to_jsonb(r.*)->>'studentId', '') = ''
                      AND LOWER(COALESCE((to_jsonb(i.*)->'items')::text, '')) ~ 'sms\s*top[\s-]*up|sms\s*units|subscription|platform\s*license'
                  )
              )
              AND NOT EXISTS (
                  SELECT 1 FROM public.expenses e
                  WHERE e.id::text = 'exp_mig_' || r.id::text
                     OR (
                         COALESCE(to_jsonb(e.*)->>'institution_id', to_jsonb(e.*)->>'institutionId', '') = COALESCE(to_jsonb(r.*)->>'institution_id', to_jsonb(r.*)->>'institutionId', '')
                         AND COALESCE(to_jsonb(e.*)->>'reference_number', to_jsonb(e.*)->>'referenceNumber', '') <> ''
                         AND COALESCE(to_jsonb(e.*)->>'reference_number', to_jsonb(e.*)->>'referenceNumber', '') = COALESCE(
                             NULLIF(COALESCE(to_jsonb(r.*)->>'related_transaction_id', to_jsonb(r.*)->>'relatedTransactionId'), ''),
                             NULLIF(COALESCE(to_jsonb(r.*)->>'receipt_number', to_jsonb(r.*)->>'receiptNumber'), ''),
                             r.id::text
                         )
                     )
              )
            ON CONFLICT (id) DO NOTHING;

            GET DIAGNOSTICS v_moved_count = ROW_COUNT;
        END IF;

        -- 2. Remove misclassified SMS / Subscription rows from public.receipts
        DELETE FROM public.receipts r
        WHERE COALESCE(to_jsonb(r.*)->>'institution_id', to_jsonb(r.*)->>'institutionId', '') NOT IN ('', 'GLOBAL', 'SYSTEM')
          AND (
              r.id::text LIKE 'rec_sms_%'
              OR r.id::text LIKE 'rec_sub_%'
              OR UPPER(COALESCE(to_jsonb(r.*)->>'receipt_number', to_jsonb(r.*)->>'receiptNumber', '')) LIKE '%SMS-%'
              OR UPPER(COALESCE(to_jsonb(r.*)->>'receipt_number', to_jsonb(r.*)->>'receiptNumber', '')) LIKE '%SUB-%'
              OR LOWER(COALESCE(to_jsonb(r.*)->>'paid_for', to_jsonb(r.*)->>'paidFor', '')) ~ 'sms\s*top[\s-]*up|sms\s*units|subscription|platform\s*license'
              OR EXISTS (
                  SELECT 1 FROM public.invoices i
                  WHERE i.id::text = COALESCE(to_jsonb(r.*)->>'invoice_id', to_jsonb(r.*)->>'invoiceId', '')
                    AND COALESCE(to_jsonb(i.*)->>'student_id', to_jsonb(i.*)->>'studentId', '') = ''
                    AND (
                        i.id::text LIKE 'inv_sms_%'
                        OR i.id::text LIKE 'inv_sub_%'
                        OR LOWER(COALESCE((to_jsonb(i.*)->'items')::text, '')) ~ 'sms\s*top[\s-]*up|sms\s*units|subscription|platform\s*license'
                    )
              )
          );
        GET DIAGNOSTICS v_deleted_rec = ROW_COUNT;
    END IF;

    -- 3. Remove misclassified SMS / Subscription rows from public.invoices
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        DELETE FROM public.invoices i
        WHERE COALESCE(to_jsonb(i.*)->>'institution_id', to_jsonb(i.*)->>'institutionId', '') NOT IN ('', 'GLOBAL', 'SYSTEM')
          AND COALESCE(to_jsonb(i.*)->>'student_id', to_jsonb(i.*)->>'studentId', '') = ''
          AND (
              i.id::text LIKE 'inv_sms_%'
              OR i.id::text LIKE 'inv_sub_%'
              OR UPPER(COALESCE(to_jsonb(i.*)->>'invoice_number', to_jsonb(i.*)->>'invoiceNumber', '')) LIKE '%SMS-%'
              OR UPPER(COALESCE(to_jsonb(i.*)->>'invoice_number', to_jsonb(i.*)->>'invoiceNumber', '')) LIKE '%SUB-%'
              OR LOWER(COALESCE((to_jsonb(i.*)->'items')::text, '')) ~ 'sms\s*top[\s-]*up|sms\s*units|subscription|platform\s*license'
          );
        GET DIAGNOSTICS v_deleted_inv = ROW_COUNT;
    END IF;

    RAISE NOTICE 'Migration 552 complete: backfilled % expenses, removed % misclassified receipts and % invoices.', v_moved_count, v_deleted_rec, v_deleted_inv;
END $$;
