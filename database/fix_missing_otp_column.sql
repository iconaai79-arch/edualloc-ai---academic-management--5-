-- Fix missing columns in institutions table
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS is_otp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS use_allocation_requests BOOLEAN DEFAULT TRUE;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS is_in_demo_mode BOOLEAN DEFAULT FALSE;
