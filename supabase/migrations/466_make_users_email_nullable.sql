-- Migration 466: Make users.email nullable
-- Path: supabase/migrations/466_make_users_email_nullable.sql
-- Description: Drops NOT NULL constraint on public.users.email to support students, pupils, parents, and offline accounts without emails.
-- Resolves: "[api/records POST] Table/column 'users' schema mismatch, fallback handled locally: null value in column "email" of relation "users" violates not-null constraint"

DO $$ 
BEGIN
    -- 1. Drop NOT NULL constraint on public.users.email if it exists
    ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
    RAISE NOTICE 'Successfully dropped NOT NULL constraint on public.users.email';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notice: Altering column email on users table failed or already nullable: %', SQLERRM;
END $$;
