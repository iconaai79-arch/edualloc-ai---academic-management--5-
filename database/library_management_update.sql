
-- 📚 Library Management System - Master Schema Update
-- 🎯 Purpose: Ensures all library features (Analytics, Fines, Reservations, Accession Tracking) are fully supported.
-- 🛠️ Method: Safe/Idempotent (Can be run multiple times)

-- 1. [CORE] Update Books Table with Accession Number
-- This allows tracking unique physical copies of the same book title.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='books' AND column_name='accession_number') THEN
        ALTER TABLE books ADD COLUMN accession_number TEXT;
        COMMENT ON COLUMN books.accession_number IS 'Unique identifier for the physical copy of the book';
    END IF;
END $$;

-- 2. [FINANCE] Update Library Transactions with Fine Tracking
-- Allows recording fines directly on a lending transaction.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='library_transactions' AND column_name='fine_amount') THEN
        ALTER TABLE library_transactions ADD COLUMN fine_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- 3. [TABLE] Library Fines
-- Detailed tracking of penalties, payments, and descriptions.
CREATE TABLE IF NOT EXISTS library_fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES library_transactions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, partially_paid, paid
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE
);

-- 4. [TABLE] Book Reservations
-- Manage student requests for currently unavailable books.
CREATE TABLE IF NOT EXISTS book_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reservation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, fulfilled, cancelled, expired
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE
);

-- 5. [TABLE] Book Stock Receipts
-- Tracking book sourcing (Donations, Purchases, Government Supply).
CREATE TABLE IF NOT EXISTS book_stock_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    source VARCHAR(100) NOT NULL, -- Sponsor name, 'Government', etc.
    quantity INTEGER NOT NULL,
    receipt_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    batch_number VARCHAR(50),
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE
);

-- 6. [TABLE] Library Settings
-- Institutional configurations for lending and fines.
CREATE TABLE IF NOT EXISTS library_settings (
    institution_id UUID PRIMARY KEY REFERENCES institutions(id) ON DELETE CASCADE,
    overdue_fine_per_day DECIMAL(10,2) DEFAULT 0,
    max_books_per_user INTEGER DEFAULT 3,
    reservation_expiry_days INTEGER DEFAULT 3,
    default_lending_period_days INTEGER DEFAULT 14,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. [VIEW] Library Analytics Statistics
-- Powering the Library Reports Dashboard.
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

-- 8. [SECURITY] Enable Row Level Security (RLS)
ALTER TABLE library_fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_stock_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_settings ENABLE ROW LEVEL SECURITY;

-- 9. [POLICIES] Basic Access Policies
-- Allow all authenticated users to read library settings
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read access' AND tablename = 'library_settings') THEN
        CREATE POLICY "Allow authenticated read access" ON library_settings FOR SELECT TO authenticated USING (true);
    END IF;
END $$;
