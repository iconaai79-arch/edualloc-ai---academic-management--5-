-- Migration 350: Ensure updated_at and created_at columns on institutions table and reload schema
ALTER TABLE IF EXISTS public.institutions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
