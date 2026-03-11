-- Migration 090: Fix PM Inquiries, Notifications and Marketplace RLS
-- This migration ensures robust inquiry submission and notification handling.
-- It is designed to be idempotent and self-healing.

-- 0. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ensure app_notifications table exists with the correct schema
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_notifications') THEN
        CREATE TABLE public.app_notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id TEXT, -- Use TEXT to support custom 'user_...' ID format
            institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            type TEXT NOT NULL,
            link TEXT,
            is_read BOOLEAN DEFAULT false,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
        
        -- Default Policies from 082 (if table was just created)
        CREATE POLICY "Users can view their own notifications" ON public.app_notifications FOR SELECT USING (user_id::text = auth.uid()::text OR user_id::text = 'u_' || auth.uid()::text);
        CREATE POLICY "Staff can manage notifications for their institution" ON public.app_notifications FOR ALL USING (institution_id IN (SELECT institution_id FROM public.users WHERE id::text = auth.uid()::text OR id::text = 'u_' || auth.uid()::text));
        CREATE POLICY "Allow public/authenticated to create notifications" ON public.app_notifications FOR INSERT WITH CHECK (true);
    ELSE
        -- Table exists, ensure ID and user_id are TEXT
        ALTER TABLE public.app_notifications ALTER COLUMN id TYPE TEXT USING id::text;
        ALTER TABLE public.app_notifications ALTER COLUMN user_id TYPE TEXT;
        
        -- Drop and recreate policies with fix
        DROP POLICY IF EXISTS "Users can view their own notifications" ON public.app_notifications;
        DROP POLICY IF EXISTS "Staff can manage notifications for their institution" ON public.app_notifications;
        
        CREATE POLICY "Users can view their own notifications" ON public.app_notifications FOR SELECT USING (user_id::text = auth.uid()::text OR user_id::text = 'u_' || auth.uid()::text);
        CREATE POLICY "Staff can manage notifications for their institution" ON public.app_notifications FOR ALL USING (institution_id IN (SELECT institution_id FROM public.users WHERE id::text = auth.uid()::text OR id::text = 'u_' || auth.uid()::text));
    END IF;
END $$;

-- 2. Update pm_inquiries RLS for public submissions and staff access fix
-- Ensure pm_inquiries.id is TEXT (to handle string IDs from frontend)
ALTER TABLE public.pm_inquiries ALTER COLUMN id TYPE TEXT USING id::text;

DROP POLICY IF EXISTS "Staff access to inquiries" ON public.pm_inquiries;
CREATE POLICY "Staff access to inquiries" 
    ON public.pm_inquiries FOR ALL 
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id::text = auth.uid()::text OR id::text = 'u_' || auth.uid()::text
    ));
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.pm_inquiries;
DROP POLICY IF EXISTS "Allow public marketplace inquiries" ON public.pm_inquiries;
CREATE POLICY "Allow public marketplace inquiries" 
ON public.pm_inquiries FOR INSERT 
WITH CHECK (true);

-- 3. Update pm_listings RLS for view/inquiry count updates
-- Ensure pm_listings.id is TEXT
ALTER TABLE public.pm_listings ALTER COLUMN id TYPE TEXT USING id::text;

DROP POLICY IF EXISTS "Public can update view counts" ON public.pm_listings;
DROP POLICY IF EXISTS "Allow anonymous count updates" ON public.pm_listings;
CREATE POLICY "Allow anonymous count updates" 
ON public.pm_listings FOR UPDATE
USING (status = 'Published')
WITH CHECK (status = 'Published');

-- 4. Ensure retail_wishlist has similar anonymous update policy for view counts
DROP POLICY IF EXISTS "Allow anonymous view count updates" ON public.retail_wishlist;
CREATE POLICY "Allow anonymous view count updates" 
ON public.retail_wishlist FOR UPDATE
USING (true)
WITH CHECK (true);

-- 5. Create atomic increment function (RPC)
CREATE OR REPLACE FUNCTION increment_module_count(t_name TEXT, r_id TEXT, f_name TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE format('UPDATE %I SET %I = COALESCE(%I, 0) + 1 WHERE id = %L', t_name, f_name, f_name, r_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
