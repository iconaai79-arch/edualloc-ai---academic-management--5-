-- Migration 277: Add signatures and security officer columns to visitors table
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS visitor_signature TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS host_signature TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS security_officer_name TEXT;
