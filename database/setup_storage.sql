-- SUPABASE STORAGE CONFIGURATION
-- Run this in your Supabase SQL Editor to enable file uploads for branding

-- 1. Create the 'eduai' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('eduai', 'eduai', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS Policies for the 'eduai' bucket
-- Allow public (anon and authenticated) access to read files
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'eduai');

-- Allow public (anon and authenticated) to upload files
-- This is necessary because the app uses a custom users table rather than Supabase Auth
CREATE POLICY "Public Upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'eduai');

-- Allow public to update and delete files
CREATE POLICY "Public Update" ON storage.objects
FOR UPDATE USING (bucket_id = 'eduai');

CREATE POLICY "Public Delete" ON storage.objects
FOR DELETE USING (bucket_id = 'eduai');
