-- Create pm_inquiries table for tracking marketplace leads
CREATE TABLE IF NOT EXISTS public.pm_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    listing_id TEXT REFERENCES public.pm_listings(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    inquiry_date DATE, -- For preferred viewing date
    message TEXT,
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pm_inquiries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff can view their property inquiries" 
    ON public.pm_inquiries FOR SELECT 
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Staff can manage their property inquiries" 
    ON public.pm_inquiries FOR ALL 
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Allow anonymous marketplace property inquiries" 
    ON public.pm_inquiries FOR INSERT 
    WITH CHECK (true);
