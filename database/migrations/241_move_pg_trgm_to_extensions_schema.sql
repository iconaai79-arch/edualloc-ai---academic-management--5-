-- Migration: Move pg_trgm extension to extensions schema
-- Description: Resolves Supabase linter warning "Extension pg_trgm is installed in the public schema"

CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm if installed in another schema (e.g. public)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE e.extname = 'pg_trgm' AND n.nspname != 'extensions'
    ) THEN
        ALTER EXTENSION pg_trgm SET SCHEMA extensions;
    ELSIF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
    ) THEN
        CREATE EXTENSION pg_trgm WITH SCHEMA extensions;
    END IF;
END $$;

-- Ensure roles have usage access to extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
