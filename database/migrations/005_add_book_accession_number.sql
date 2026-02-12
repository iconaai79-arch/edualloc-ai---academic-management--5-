
-- Migration: Add accession_number to books table
-- Description: Adds a column to track unique physical copy identifiers for library books.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='books' AND column_name='accession_number'
    ) THEN
        ALTER TABLE books ADD COLUMN accession_number TEXT;
    END IF;
END $$;

-- Update the library statistics view to ensure it's current
CREATE OR REPLACE VIEW v_library_statistics AS
SELECT 
    institution_id,
    COUNT(id) as total_books,
    SUM(quantity) as total_copies,
    SUM(available) as available_copies,
    (SELECT COUNT(*) FROM library_transactions WHERE status = 'issued' AND institution_id = b.institution_id) as active_loans,
    (SELECT COUNT(*) FROM library_transactions WHERE status = 'overdue' AND institution_id = b.institution_id) as overdue_loans,
    (SELECT COUNT(*) FROM book_reservations WHERE status = 'pending' AND institution_id = b.institution_id) as pending_reservations
FROM books b
GROUP BY institution_id;
