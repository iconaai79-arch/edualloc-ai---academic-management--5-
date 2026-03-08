-- 077_add_member_signature_to_library_transactions.sql
-- Adds member_signature column to library_transactions table
-- This supports digital signatures during book issuance.

ALTER TABLE public.library_transactions 
ADD COLUMN IF NOT EXISTS member_signature TEXT;
