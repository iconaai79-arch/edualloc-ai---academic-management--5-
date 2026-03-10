-- Configure RLS policies for Supabase Storage

-- Ensure the 'eduai' bucket exists first (idempotent)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('eduai', 'eduai', true)
ON CONFLICT (id) DO NOTHING;

-- Policy 1: Allow public read access to all files in the 'eduai' bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'eduai' );

-- Policy 2: Allow anon and authenticated users to upload files to 'eduai'
CREATE POLICY "Anon Upload Access" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'eduai' );

-- Policy 3: Allow users to update files (upsert)
CREATE POLICY "Anon Update Access" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'eduai' );

-- Policy 4: Allow users to delete files
CREATE POLICY "Anon Delete Access"
ON storage.objects FOR DELETE
USING ( bucket_id = 'eduai' );
