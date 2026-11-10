-- ============================================================================
-- TalkSasa PostgreSQL Repair Script: Restore & Backfill public.invoices & public.receipts
-- Run this in pgAdmin / psql on your TalkSasa database if invoices or receipts
-- return 0 records or are missing snake_case columns from camelCase backups.
-- ============================================================================

BEGIN;

-- 1. Ensure all snake_case and camelCase columns exist on public.invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issue_date TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "issueDate" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "dueDate" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "totalAmount" NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "amountPaid" NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "paidAmount" NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Unpaid';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "studentName" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "className" TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_tax_pin TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_address TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_rate NUMERIC;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Drop restrictive foreign keys, relax NOT NULL constraints, and widen DATE columns to TEXT
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_institution_id_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_student_id_fkey;
ALTER TABLE public.invoices ALTER COLUMN invoice_number DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN institution_id DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN issue_date DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN due_date DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN items DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN total_amount DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN status DROP NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN issue_date TYPE TEXT USING issue_date::text;
ALTER TABLE public.invoices ALTER COLUMN due_date TYPE TEXT USING due_date::text;

-- 2. Copy camelCase values to snake_case columns on public.invoices
UPDATE public.invoices
SET institution_id = COALESCE(NULLIF(institution_id, ''), NULLIF("institutionId", ''), metadata->>'institutionId', metadata->>'institution_id')
WHERE (institution_id IS NULL OR institution_id = '');

UPDATE public.invoices
SET "institutionId" = institution_id
WHERE ("institutionId" IS NULL OR "institutionId" = '') AND institution_id IS NOT NULL;

UPDATE public.invoices
SET invoice_number = COALESCE(NULLIF(invoice_number, ''), NULLIF("invoiceNumber", ''), metadata->>'invoiceNumber', metadata->>'invoice_number', id)
WHERE (invoice_number IS NULL OR invoice_number = '');

UPDATE public.invoices
SET "invoiceNumber" = invoice_number
WHERE ("invoiceNumber" IS NULL OR "invoiceNumber" = '') AND invoice_number IS NOT NULL;

UPDATE public.invoices
SET student_id = COALESCE(NULLIF(student_id, ''), NULLIF("studentId", ''), metadata->>'studentId', metadata->>'student_id')
WHERE (student_id IS NULL OR student_id = '');

UPDATE public.invoices
SET "studentId" = student_id
WHERE ("studentId" IS NULL OR "studentId" = '') AND student_id IS NOT NULL;

UPDATE public.invoices
SET student_name = COALESCE(NULLIF(student_name, ''), NULLIF("studentName", ''), metadata->>'studentName', metadata->>'student_name')
WHERE (student_name IS NULL OR student_name = '');

UPDATE public.invoices
SET admission_number = COALESCE(NULLIF(admission_number, ''), NULLIF("admissionNumber", ''), metadata->>'admissionNumber', metadata->>'admission_number')
WHERE (admission_number IS NULL OR admission_number = '');

UPDATE public.invoices
SET class_name = COALESCE(NULLIF(class_name, ''), NULLIF("className", ''), metadata->>'className', metadata->>'class_name')
WHERE (class_name IS NULL OR class_name = '');

UPDATE public.invoices
SET issue_date = COALESCE(NULLIF(issue_date::text, ''), NULLIF("issueDate"::text, ''), SPLIT_PART(created_at::text, ' ', 1))
WHERE (issue_date IS NULL OR issue_date::text = '');

UPDATE public.invoices
SET due_date = COALESCE(NULLIF(due_date::text, ''), NULLIF("dueDate"::text, ''), issue_date::text)
WHERE (due_date IS NULL OR due_date::text = '');

UPDATE public.invoices
SET total_amount = COALESCE(NULLIF("totalAmount"::text, '')::numeric, 0)
WHERE (total_amount IS NULL OR total_amount = 0) AND "totalAmount" IS NOT NULL AND "totalAmount"::text <> '';

UPDATE public.invoices
SET amount_paid = COALESCE(NULLIF("amountPaid"::text, '')::numeric, NULLIF("paidAmount"::text, '')::numeric, paid_amount, 0)
WHERE (amount_paid IS NULL OR amount_paid = 0);

UPDATE public.invoices
SET "totalAmount" = COALESCE(total_amount, 0),
    "amountPaid" = COALESCE(amount_paid, 0),
    paid_amount = COALESCE(amount_paid, 0),
    "paidAmount" = COALESCE(amount_paid, 0),
    balance = COALESCE(balance, GREATEST(0, COALESCE(total_amount, 0) - COALESCE(amount_paid, 0))),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW());

-- Clear bogus branch_id values that hold institution_id instead of a real branch
UPDATE public.invoices
SET branch_id = NULL
WHERE branch_id IS NOT NULL AND (branch_id = institution_id OR branch_id LIKE 'inst_%' OR branch_id = '');

-- Backfill missing institution_id, student_name, admission_number, class_name from public.users / public.student_enrollments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        UPDATE public.invoices i
        SET
            institution_id = COALESCE(NULLIF(i.institution_id, ''), u.institution_id),
            "institutionId" = COALESCE(NULLIF(i."institutionId", ''), u.institution_id),
            student_name = COALESCE(NULLIF(i.student_name, ''), u.name),
            "studentName" = COALESCE(NULLIF(i."studentName", ''), u.name),
            admission_number = COALESCE(NULLIF(i.admission_number, ''), u.admission_number),
            "admissionNumber" = COALESCE(NULLIF(i."admissionNumber", ''), u.admission_number),
            class_name = COALESCE(NULLIF(i.class_name, ''), u.student_class)
        FROM public.users u
        WHERE i.student_id IS NOT NULL AND u.id::text = i.student_id::text;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_enrollments') THEN
        UPDATE public.invoices i
        SET
            institution_id = COALESCE(NULLIF(i.institution_id, ''), se.institution_id),
            "institutionId" = COALESCE(NULLIF(i."institutionId", ''), se.institution_id),
            admission_number = COALESCE(NULLIF(i.admission_number, ''), se.admission_number),
            "admissionNumber" = COALESCE(NULLIF(i."admissionNumber", ''), se.admission_number),
            student_name = COALESCE(NULLIF(i.student_name, ''), se.metadata->>'studentName', se.metadata->>'fullName', se.metadata->>'name'),
            "studentName" = COALESCE(NULLIF(i."studentName", ''), se.metadata->>'studentName', se.metadata->>'fullName', se.metadata->>'name'),
            class_name = COALESCE(NULLIF(i.class_name, ''), se.metadata->>'studentClass', se.metadata->>'gradeLevel')
        FROM public.student_enrollments se
        WHERE i.student_id IS NOT NULL AND (se.id::text = i.student_id::text OR (se.user_id IS NOT NULL AND se.user_id::text = i.student_id::text));
    END IF;
END $$;

-- 3. Ensure all snake_case and camelCase columns exist on public.receipts
CREATE TABLE IF NOT EXISTS public.receipts (
    id TEXT PRIMARY KEY
);

ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS payment_date TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "paymentDate" TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "amountPaid" NUMERIC DEFAULT 0;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS paid_for TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "paidFor" TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS related_transaction_id TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "relatedTransactionId" TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS invoice_id TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "studentName" TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_institution_id_fkey;
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_student_id_fkey;
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_invoice_id_fkey;
ALTER TABLE public.receipts ALTER COLUMN receipt_number DROP NOT NULL;
ALTER TABLE public.receipts ALTER COLUMN institution_id DROP NOT NULL;
ALTER TABLE public.receipts ALTER COLUMN payment_date DROP NOT NULL;
ALTER TABLE public.receipts ALTER COLUMN amount_paid DROP NOT NULL;
ALTER TABLE public.receipts ALTER COLUMN paid_for DROP NOT NULL;
ALTER TABLE public.receipts ALTER COLUMN payment_method DROP NOT NULL;
ALTER TABLE public.receipts ALTER COLUMN payment_date TYPE TEXT USING payment_date::text;

UPDATE public.receipts
SET institution_id = COALESCE(NULLIF(institution_id, ''), NULLIF("institutionId", ''), metadata->>'institutionId', metadata->>'institution_id')
WHERE (institution_id IS NULL OR institution_id = '');

UPDATE public.receipts
SET "institutionId" = institution_id
WHERE ("institutionId" IS NULL OR "institutionId" = '') AND institution_id IS NOT NULL;

UPDATE public.receipts
SET receipt_number = COALESCE(NULLIF(receipt_number, ''), NULLIF("receiptNumber", ''), id)
WHERE (receipt_number IS NULL OR receipt_number = '');

UPDATE public.receipts
SET "receiptNumber" = receipt_number
WHERE ("receiptNumber" IS NULL OR "receiptNumber" = '') AND receipt_number IS NOT NULL;

UPDATE public.receipts
SET payment_date = COALESCE(NULLIF(payment_date::text, ''), NULLIF("paymentDate"::text, ''), SPLIT_PART(created_at::text, ' ', 1))
WHERE (payment_date IS NULL OR payment_date::text = '');

UPDATE public.receipts
SET "paymentDate" = payment_date::text
WHERE ("paymentDate" IS NULL OR "paymentDate"::text = '') AND payment_date IS NOT NULL;

UPDATE public.receipts
SET amount_paid = COALESCE(NULLIF("amountPaid"::text, '')::numeric, amount, 0)
WHERE (amount_paid IS NULL OR amount_paid = 0);

UPDATE public.receipts
SET "amountPaid" = COALESCE(amount_paid, 0),
    amount = COALESCE(amount_paid, 0),
    paid_for = COALESCE(NULLIF(paid_for, ''), NULLIF("paidFor", ''), 'Fee Payment'),
    "paidFor" = COALESCE(NULLIF("paidFor", ''), NULLIF(paid_for, ''), 'Fee Payment'),
    payment_method = COALESCE(NULLIF(payment_method, ''), NULLIF("paymentMethod", ''), 'Cash'),
    "paymentMethod" = COALESCE(NULLIF("paymentMethod", ''), NULLIF(payment_method, ''), 'Cash'),
    related_transaction_id = COALESCE(NULLIF(related_transaction_id, ''), NULLIF("relatedTransactionId", '')),
    invoice_id = COALESCE(NULLIF(invoice_id, ''), NULLIF("invoiceId", '')),
    student_id = COALESCE(NULLIF(student_id, ''), NULLIF("studentId", '')),
    student_name = COALESCE(NULLIF(student_name, ''), NULLIF("studentName", '')),
    admission_number = COALESCE(NULLIF(admission_number, ''), NULLIF("admissionNumber", '')),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW());

UPDATE public.receipts
SET branch_id = NULL
WHERE branch_id IS NOT NULL AND (branch_id = institution_id OR branch_id LIKE 'inst_%' OR branch_id = '');

-- Backfill missing institution_id, student_name, admission_number on receipts from public.users / public.student_enrollments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        UPDATE public.receipts r
        SET
            institution_id = COALESCE(NULLIF(r.institution_id, ''), u.institution_id),
            "institutionId" = COALESCE(NULLIF(r."institutionId", ''), u.institution_id),
            student_name = COALESCE(NULLIF(r.student_name, ''), u.name),
            "studentName" = COALESCE(NULLIF(r."studentName", ''), u.name),
            admission_number = COALESCE(NULLIF(r.admission_number, ''), u.admission_number),
            "admissionNumber" = COALESCE(NULLIF(r."admissionNumber", ''), u.admission_number)
        FROM public.users u
        WHERE r.student_id IS NOT NULL AND u.id::text = r.student_id::text;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_enrollments') THEN
        UPDATE public.receipts r
        SET
            institution_id = COALESCE(NULLIF(r.institution_id, ''), se.institution_id),
            "institutionId" = COALESCE(NULLIF(r."institutionId", ''), se.institution_id),
            admission_number = COALESCE(NULLIF(r.admission_number, ''), se.admission_number),
            "admissionNumber" = COALESCE(NULLIF(r."admissionNumber", ''), se.admission_number),
            student_name = COALESCE(NULLIF(r.student_name, ''), se.metadata->>'studentName', se.metadata->>'fullName', se.metadata->>'name'),
            "studentName" = COALESCE(NULLIF(r."studentName", ''), se.metadata->>'studentName', se.metadata->>'fullName', se.metadata->>'name')
        FROM public.student_enrollments se
        WHERE r.student_id IS NOT NULL AND (se.id::text = r.student_id::text OR (se.user_id IS NOT NULL AND se.user_id::text = r.student_id::text));
    END IF;
END $$;

COMMIT;

-- Verification summary
SELECT 'invoices' AS table_name, COUNT(*) AS total_rows, COUNT(institution_id) AS with_institution_id FROM public.invoices
UNION ALL
SELECT 'receipts' AS table_name, COUNT(*) AS total_rows, COUNT(institution_id) AS with_institution_id FROM public.receipts;
