-- Migration: Add Quotes and Payments to Demo Requests
-- Description: Adds fields for storing quote details, quote amounts, quote storage URLs, and a payments log array to demo_requests. Extends status values.

-- Drop the check constraint if it exists. PostgreSQL generates "demo_requests_status_check" for the inline check constraint.
ALTER TABLE demo_requests DROP CONSTRAINT IF EXISTS demo_requests_status_check;

-- Add check constraint with 'quote_sent' included
ALTER TABLE demo_requests ADD CONSTRAINT demo_requests_status_check CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'cancelled', 'quote_sent'));

-- Add columns for quotes and payments if they do not exist
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS quote_amount NUMERIC DEFAULT 0;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS quote_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS quote_url TEXT;

-- Create UPDATE policy on demo_requests to allow updating records
DROP POLICY IF EXISTS "Allow update demo requests" ON demo_requests;
CREATE POLICY "Allow update demo requests" ON demo_requests FOR UPDATE USING (true) WITH CHECK (true);
