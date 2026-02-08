-- SUPABASE STORAGE CONFIGURATION
-- Run this in your Supabase SQL Editor to enable file uploads for branding

-- 1. Create the 'eduai' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('eduai', 'eduai', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS Policies for the 'eduai' bucket
-- Allow public access to read files
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'eduai');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'eduai' 
    AND auth.role() = 'authenticated'
);

-- Allow owners to update/delete their own files
CREATE POLICY "Owner Updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'eduai' AND auth.uid() = owner);

CREATE POLICY "Owner Deletions" ON storage.objects
FOR DELETE USING (bucket_id = 'eduai' AND auth.uid() = owner);
