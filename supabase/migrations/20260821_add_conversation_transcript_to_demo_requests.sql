-- Migration: Add conversation_transcript and related fields to demo_requests
-- Run this in your Supabase SQL Editor to resolve the stale schema cache and enable storing conversation transcripts.

-- 1. Create table if not exists or add missing columns
CREATE TABLE IF NOT EXISTS public.demo_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    institution TEXT,
    phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add conversation_transcript and additional tracking columns
ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS conversation_transcript JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'AI Showcase Advisor';
ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Enable RLS and configure permissive policies
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for all" ON public.demo_requests;
DROP POLICY IF EXISTS "Public can insert demo requests" ON public.demo_requests;
CREATE POLICY "Public can insert demo requests" ON public.demo_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for admins" ON public.demo_requests;
DROP POLICY IF EXISTS "Staff can view demo requests" ON public.demo_requests;
CREATE POLICY "Staff can view demo requests" ON public.demo_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow update demo requests" ON public.demo_requests;
CREATE POLICY "Allow update demo requests" ON public.demo_requests FOR UPDATE USING (true) WITH CHECK (true);

-- 4. Grant table privileges
GRANT ALL ON public.demo_requests TO anon, authenticated, service_role;

-- 5. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
