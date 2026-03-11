-- 082_add_notifications_and_wishlist_status.sql

-- 1. Add status to retail_wishlist
ALTER TABLE public.retail_wishlist 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Open';

-- 2. Create app_notifications table
CREATE TABLE IF NOT EXISTS public.app_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for app_notifications
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON public.app_notifications FOR SELECT
    USING (user_id::text = auth.uid()::text OR user_id::text = 'u_' || auth.uid()::text);

-- System/Staff can manage notifications for their institution
CREATE POLICY "Staff can manage notifications for their institution"
    ON public.app_notifications FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id::text = auth.uid()::text OR id::text = 'u_' || auth.uid()::text
    ));

-- Allow anyone to create notifications (e.g. from marketplace submissions)
-- but restricted to specific types if needed. For now, open for insert.
CREATE POLICY "Allow public/authenticated to create notifications"
    ON public.app_notifications FOR INSERT
    WITH CHECK (true);
