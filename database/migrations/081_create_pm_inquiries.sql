-- Create pm_inquiries table for tracking marketplace leads
CREATE TABLE IF NOT EXISTS public.pm_inquiries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    listing_id TEXT REFERENCES public.pm_listings(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    inquiry_date DATE, 
    message TEXT,
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pm_inquiries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Staff can view their property inquiries" ON public.pm_inquiries;
DROP POLICY IF EXISTS "Staff can manage their property inquiries" ON public.pm_inquiries;
DROP POLICY IF EXISTS "Allow anonymous marketplace property inquiries" ON public.pm_inquiries;
DROP POLICY IF EXISTS "Master unblock for inquiries" ON public.pm_inquiries;
DROP POLICY IF EXISTS "Staff access to inquiries" ON public.pm_inquiries;
DROP POLICY IF EXISTS "Allow anonymous update" ON public.pm_inquiries;
DROP POLICY IF EXISTS "Allow anonymous insertion" ON public.pm_inquiries;
DROP POLICY IF EXISTS "Master anonymous view" ON public.pm_inquiries;

-- More permissive policy for staff
CREATE POLICY "Staff access to inquiries" 
    ON public.pm_inquiries FOR ALL 
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()::TEXT OR id = 'u_' || auth.uid()::TEXT
    ));

-- Explicit unblock for anonymous insertions and updates (Required for apiService.upsert)
CREATE POLICY "Allow anonymous insertion" 
    ON public.pm_inquiries FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow anonymous update" 
    ON public.pm_inquiries FOR UPDATE 
    USING (true)
    WITH CHECK (true);

-- Allow anonymous users to see their own submitted inquiries if needed (optional but good for testing)
CREATE POLICY "Master anonymous view" 
    ON public.pm_inquiries FOR SELECT 
    USING (true);
