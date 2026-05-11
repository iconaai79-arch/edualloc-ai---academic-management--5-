-- Migration 207: Add student_id to ds_payments
ALTER TABLE ds_payments 
ADD COLUMN IF NOT EXISTS student_id TEXT REFERENCES ds_students(id) ON DELETE SET NULL;

-- Also update existing records if possible (optional but good)
UPDATE ds_payments p
SET student_id = i.student_id
FROM ds_invoices i
WHERE p.invoice_id = i.id AND p.student_id IS NULL;
