-- Migration 354: Add class_name to invoices table
ALTER TABLE IF EXISTS invoices ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE IF EXISTS invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_class_name ON invoices (institution_id, class_name);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices (institution_id, student_id);
