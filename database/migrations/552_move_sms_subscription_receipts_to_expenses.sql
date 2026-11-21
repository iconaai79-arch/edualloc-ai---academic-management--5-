-- ============================================================================
-- MIGRATION 552: MOVE MISCLASSIFIED SMS TOP-UP & SUBSCRIPTION RECEIPTS TO EXPENSES
-- Ensures client SMS unit purchases and platform subscription payments are recorded
-- as school EXPENDITURES (public.expenses) and removed from school INCOME (public.receipts).
-- Safe & Idempotent.
-- ============================================================================

DO $$
DECLARE
    v_moved_count INTEGER := 0;
    v_deleted_rec INTEGER := 0;
    v_deleted_inv INTEGER := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipts') THEN
        -- 1. Backfill into public.expenses if not already recorded
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
            INSERT INTO public.expenses (
                id, institution_id, category, description, amount, expense_date,
                payment_method, reference_number, status, created_at
            )
            SELECT
                'exp_mig_' || r.id,
                r.institution_id,
                CASE
                    WHEN LOWER(COALESCE(r.id, '') || ' ' || COALESCE(r.receipt_number, '') || ' ' || COALESCE(r.paid_for, '') || ' ' || COALESCE(i.items::text, '')) LIKE '%sms%'
                        THEN 'SMS & Communications'
                    ELSE 'Software & Subscriptions'
                END,
                COALESCE(
                    NULLIF(TRIM(r.paid_for), ''),
                    NULLIF(TRIM(i.items->0->>'description'), ''),
                    'Platform SMS / Subscription Purchase'
                ),
                COALESCE(r.amount_paid, 0),
                COALESCE(r.payment_date, CURRENT_DATE),
                COALESCE(r.payment_method, 'M-Pesa'),
                COALESCE(r.related_transaction_id, r.receipt_number, r.id),
                'Approved',
                COALESCE(r.created_at, NOW())
            FROM public.receipts r
            LEFT JOIN public.invoices i ON i.id = r.invoice_id
            WHERE r.institution_id IS NOT NULL
              AND r.institution_id NOT IN ('GLOBAL', 'SYSTEM')
              AND (
                  r.id LIKE 'rec_sms_%'
                  OR r.id LIKE 'rec_sub_%'
                  OR UPPER(COALESCE(r.receipt_number, '')) LIKE '%SMS-%'
                  OR UPPER(COALESCE(r.receipt_number, '')) LIKE '%SUB-%'
                  OR LOWER(COALESCE(r.paid_for, '')) ~ 'sms\s*top[\s-]*up|sms\s*units|subscription|platform\s*license'
                  OR (
                      COALESCE(r.student_id, '') = ''
                      AND LOWER(COALESCE(i.items::text, '')) ~ 'sms\s*top[\s-]*up|sms\s*units|subscription|platform\s*license'
                  )
              )
              AND NOT EXISTS (
                  SELECT 1 FROM public.expenses e
                  WHERE e.id = 'exp_mig_' || r.id
                     OR (
                         e.institution_id = r.institution_id
                         AND e.reference_number IS NOT NULL
                         AND e.reference_number = COALESCE(r.related_transaction_id, r.receipt_number)
                     )
              )
            ON CONFLICT (id) DO NOTHING;

            GET DIAGNOSTICS v_moved_count = ROW_COUNT;
        END IF;

        -- 2. Remove misclassified SMS / Subscription rows from public.receipts
        DELETE FROM public.receipts r
        WHERE r.institution_id IS NOT NULL
          AND r.institution_id NOT IN ('GLOBAL', 'SYSTEM')
          AND (
              r.id LIKE 'rec_sms_%'
              OR r.id LIKE 'rec_sub_%'
              OR UPPER(COALESCE(r.receipt_number, '')) LIKE '%SMS-%'
              OR UPPER(COALESCE(r.receipt_number, '')) LIKE '%SUB-%'
              OR LOWER(COALESCE(r.paid_for, '')) ~ 'sms\s*top[\s-]*up|sms\s*units|subscription|platform\s*license'
              OR EXISTS (
                  SELECT 1 FROM public.invoices i
                  WHERE i.id = r.invoice_id
                    AND COALESCE(i.student_id, '') = ''
                    AND (
                        i.id LIKE 'inv_sms_%'
                        OR i.id LIKE 'inv_sub_%'
                        OR LOWER(COALESCE(i.items::text, '')) ~ 'sms\s*top[\s-]*up|sms\s*units|subscription|platform\s*license'
                    )
              )
          );
        GET DIAGNOSTICS v_deleted_rec = ROW_COUNT;
    END IF;

    -- 3. Remove misclassified SMS / Subscription rows from public.invoices
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        DELETE FROM public.invoices i
        WHERE i.institution_id IS NOT NULL
          AND i.institution_id NOT IN ('GLOBAL', 'SYSTEM')
          AND COALESCE(i.student_id, '') = ''
          AND (
              i.id LIKE 'inv_sms_%'
              OR i.id LIKE 'inv_sub_%'
              OR UPPER(COALESCE(i.invoice_number, '')) LIKE '%SMS-%'
              OR UPPER(COALESCE(i.invoice_number, '')) LIKE '%SUB-%'
              OR LOWER(COALESCE(i.items::text, '')) ~ 'sms\s*top[\s-]*up|sms\s*units|subscription|platform\s*license'
          );
        GET DIAGNOSTICS v_deleted_inv = ROW_COUNT;
    END IF;

    RAISE NOTICE 'Migration 552 complete: backfilled % expenses, removed % misclassified receipts and % invoices.', v_moved_count, v_deleted_rec, v_deleted_inv;
END $$;
