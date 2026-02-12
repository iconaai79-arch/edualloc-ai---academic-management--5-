
-- Library Management System Extensions

-- Update library_transactions to include fine tracking if needed, or use a separate table
-- Adding a column for penalty logic if not already present
ALTER TABLE IF EXISTS library_transactions ADD COLUMN IF NOT EXISTS fine_amount DECIMAL(10,2) DEFAULT 0;

-- Library Fines Table
CREATE TABLE IF NOT EXISTS library_fines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Book Reservations Table
CREATE TABLE IF NOT EXISTS book_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reservation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, fulfilled, cancelled, expired
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE
);

-- Book Stock Receipts Table (Tracking sponsors/government supplies)
CREATE TABLE IF NOT EXISTS book_stock_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    source VARCHAR(100) NOT NULL, -- Sponsor name, 'Government', etc.
    quantity INTEGER NOT NULL,
    receipt_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    batch_number VARCHAR(50),
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE
);

-- Library Settings Table
CREATE TABLE IF NOT EXISTS library_settings (
    institution_id UUID PRIMARY KEY REFERENCES institutions(id) ON DELETE CASCADE,
    overdue_fine_per_day DECIMAL(10,2) DEFAULT 0,
    max_books_per_user INTEGER DEFAULT 3,
    reservation_expiry_days INTEGER DEFAULT 3,
    default_lending_period_days INTEGER DEFAULT 14,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- View for Library Analytics
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
