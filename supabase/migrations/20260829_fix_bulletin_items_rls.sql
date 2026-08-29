-- Migration: 20260829_fix_bulletin_items_rls.sql
-- Description: Fix overly permissive RLS policy on public.bulletin_items.
-- Allows public SELECT (read access) while restricting INSERT, UPDATE, and DELETE to authenticated and service_role users.

-- Ensure table exists and RLS is enabled
ALTER TABLE IF EXISTS public.bulletin_items ENABLE ROW LEVEL SECURITY;

-- 1. Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow all access to bulletin_items" ON public.bulletin_items;
DROP POLICY IF EXISTS "Allow all access to bulletin_items for ALL" ON public.bulletin_items;
DROP POLICY IF EXISTS "Allow all access on bulletin_items" ON public.bulletin_items;
DROP POLICY IF EXISTS "Allow public read access on bulletin_items" ON public.bulletin_items;
DROP POLICY IF EXISTS "Allow authenticated insert on bulletin_items" ON public.bulletin_items;
DROP POLICY IF EXISTS "Allow authenticated update on bulletin_items" ON public.bulletin_items;
DROP POLICY IF EXISTS "Allow authenticated delete on bulletin_items" ON public.bulletin_items;
DROP POLICY IF EXISTS "Allow service_role full access on bulletin_items" ON public.bulletin_items;

-- 2. Create granular, secure policies

-- Allow public read access (SELECT) for announcements/bulletins
CREATE POLICY "Allow public read access on bulletin_items"
    ON public.bulletin_items
    FOR SELECT
    USING (true);

-- Restrict INSERT to authenticated users and service_role
CREATE POLICY "Allow authenticated insert on bulletin_items"
    ON public.bulletin_items
    FOR INSERT
    TO authenticated, service_role
    WITH CHECK (
        (auth.role() = 'authenticated') OR (auth.role() = 'service_role')
    );

-- Restrict UPDATE to authenticated users and service_role
CREATE POLICY "Allow authenticated update on bulletin_items"
    ON public.bulletin_items
    FOR UPDATE
    TO authenticated, service_role
    USING (
        (auth.role() = 'authenticated') OR (auth.role() = 'service_role')
    )
    WITH CHECK (
        (auth.role() = 'authenticated') OR (auth.role() = 'service_role')
    );

-- Restrict DELETE to authenticated users and service_role
CREATE POLICY "Allow authenticated delete on bulletin_items"
    ON public.bulletin_items
    FOR DELETE
    TO authenticated, service_role
    USING (
        (auth.role() = 'authenticated') OR (auth.role() = 'service_role')
    );

-- Index for institution filtering and performance
CREATE INDEX IF NOT EXISTS idx_bulletin_items_institution_id ON public.bulletin_items(institution_id);
