-- ============================================================================
-- Talksasa Database Repair: Restore ds_invoices Numbers, Amounts & Students
-- Purpose: Restores invoice_number, total_amount, admission_number, and 
--          student_name on public.ds_invoices from quoted columns, id, and ds_students.
-- ============================================================================

-- 1. Ensure all columns exist on ds_invoices
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.ds_invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';

-- 2. If double-quoted "invoiceNumber" exists, copy to invoice_number
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_invoices' AND column_name = 'invoiceNumber') THEN
        EXECUTE 'UPDATE public.ds_invoices SET invoice_number = "invoiceNumber" WHERE (invoice_number IS NULL OR invoice_number = '''' OR invoice_number = ''-'') AND "invoiceNumber" IS NOT NULL AND "invoiceNumber" != ''''';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. If double-quoted "studentName" exists, copy to student_name
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_invoices' AND column_name = 'studentName') THEN
        EXECUTE 'UPDATE public.ds_invoices SET student_name = "studentName" WHERE (student_name IS NULL OR student_name = '''' OR student_name = ''-'') AND "studentName" IS NOT NULL AND "studentName" != ''''';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. If double-quoted "admissionNumber" exists, copy to admission_number
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_invoices' AND column_name = 'admissionNumber') THEN
        EXECUTE 'UPDATE public.ds_invoices SET admission_number = "admissionNumber" WHERE (admission_number IS NULL OR admission_number = '''' OR admission_number = ''-'') AND "admissionNumber" IS NOT NULL AND "admissionNumber" != ''''';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. If double-quoted "studentId" exists, copy to student_id
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_invoices' AND column_name = 'studentId') THEN
        EXECUTE 'UPDATE public.ds_invoices SET student_id = "studentId" WHERE (student_id IS NULL OR student_id = '''') AND "studentId" IS NOT NULL AND "studentId" != ''''';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. If double-quoted "totalAmount" exists, copy to total_amount
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_invoices' AND column_name = 'totalAmount') THEN
        EXECUTE 'UPDATE public.ds_invoices SET total_amount = "totalAmount" WHERE (total_amount IS NULL OR total_amount = 0) AND "totalAmount" IS NOT NULL AND "totalAmount" > 0';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 7. If double-quoted "paidAmount" exists, copy to paid_amount
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_invoices' AND column_name = 'paidAmount') THEN
        EXECUTE 'UPDATE public.ds_invoices SET paid_amount = "paidAmount" WHERE (paid_amount IS NULL OR paid_amount = 0) AND "paidAmount" IS NOT NULL';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 8. If total_amount is 0 but balance exists, heal total_amount = balance + paid_amount
UPDATE public.ds_invoices 
SET total_amount = balance + COALESCE(paid_amount, 0)
WHERE (total_amount IS NULL OR total_amount = 0) AND balance > 0;

-- 9. Generate invoice_number from ID if still missing (e.g. Opening Balance invoices)
UPDATE public.ds_invoices
SET invoice_number = CASE 
    WHEN id LIKE 'dsi_opb_%' THEN 'OPB-' || split_part(id, '_', 3) || '-' || substr(md5(id), 1, 4)
    ELSE 'INV-' || substr(md5(id), 1, 6)
END
WHERE invoice_number IS NULL OR invoice_number = '' OR invoice_number = '-';

-- 10. Link student names and admission numbers from public.ds_students via student_id
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_students') THEN
        UPDATE public.ds_invoices inv
        SET student_name = s.full_name,
            admission_number = COALESCE(NULLIF(s.admission_number, ''), inv.admission_number)
        FROM public.ds_students s
        WHERE inv.student_id = s.id 
          AND s.full_name IS NOT NULL AND s.full_name != '' AND s.full_name != '(No Name)'
          AND (inv.student_name IS NULL OR inv.student_name = '' OR inv.student_name = '-');

        -- Also link invoices by admission_number if student_name is still missing
        UPDATE public.ds_invoices inv
        SET student_id = s.id,
            student_name = s.full_name
        FROM public.ds_students s
        WHERE inv.admission_number IS NOT NULL AND inv.admission_number = s.admission_number
          AND s.full_name IS NOT NULL AND s.full_name != '' AND s.full_name != '(No Name)'
          AND (inv.student_name IS NULL OR inv.student_name = '' OR inv.student_name = '-');
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 11. Synchronize camelCase columns back to snake_case and vice-versa
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_invoices' AND column_name = 'invoiceNumber') THEN
        EXECUTE 'UPDATE public.ds_invoices SET "invoiceNumber" = invoice_number WHERE invoice_number IS NOT NULL AND invoice_number != '''' AND ("invoiceNumber" IS NULL OR "invoiceNumber" = '''')';
        EXECUTE 'UPDATE public.ds_invoices SET invoice_number = "invoiceNumber" WHERE "invoiceNumber" IS NOT NULL AND "invoiceNumber" != '''' AND (invoice_number IS NULL OR invoice_number = '''')';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_invoices' AND column_name = 'studentName') THEN
        EXECUTE 'UPDATE public.ds_invoices SET "studentName" = student_name WHERE student_name IS NOT NULL AND student_name != '''' AND ("studentName" IS NULL OR "studentName" = '''')';
        EXECUTE 'UPDATE public.ds_invoices SET student_name = "studentName" WHERE "studentName" IS NOT NULL AND "studentName" != '''' AND (student_name IS NULL OR student_name = '''')';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_invoices' AND column_name = 'admissionNumber') THEN
        EXECUTE 'UPDATE public.ds_invoices SET "admissionNumber" = admission_number WHERE admission_number IS NOT NULL AND admission_number != '''' AND ("admissionNumber" IS NULL OR "admissionNumber" = '''')';
        EXECUTE 'UPDATE public.ds_invoices SET admission_number = "admissionNumber" WHERE "admissionNumber" IS NOT NULL AND "admissionNumber" != '''' AND (admission_number IS NULL OR admission_number = '''')';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_invoices' AND column_name = 'totalAmount') THEN
        EXECUTE 'UPDATE public.ds_invoices SET "totalAmount" = total_amount WHERE total_amount IS NOT NULL AND total_amount > 0 AND ("totalAmount" IS NULL OR "totalAmount" = 0)';
        EXECUTE 'UPDATE public.ds_invoices SET total_amount = "totalAmount" WHERE "totalAmount" IS NOT NULL AND "totalAmount" > 0 AND (total_amount IS NULL OR total_amount = 0)';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 12. View sample restored invoices
SELECT id, invoice_number, admission_number, student_name, total_amount, balance, status
FROM public.ds_invoices
ORDER BY id DESC
LIMIT 10;
