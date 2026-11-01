-- Migration 532 (v2): Fix stream_definitions column type TEXT[] → JSONB
-- Error was: "default for column cannot be cast automatically to type jsonb"
-- Fix: DROP the default first, then ALTER type, then SET new default.

-- Step 1: Drop camelCase alias if it exists (added by migration 531)
ALTER TABLE public.institutions
  DROP COLUMN IF EXISTS "streamDefinitions";

-- Step 2: Remove the old TEXT[] default BEFORE altering the type
--         (PostgreSQL cannot cast '{}' TEXT[] default to JSONB automatically)
ALTER TABLE public.institutions
  ALTER COLUMN stream_definitions DROP DEFAULT;

-- Step 3: Change stream_definitions from TEXT[] to JSONB,
--         safely converting any existing text-array values.
ALTER TABLE public.institutions
  ALTER COLUMN stream_definitions
  TYPE JSONB
  USING CASE
    WHEN stream_definitions IS NULL THEN '[]'::jsonb
    ELSE to_jsonb(stream_definitions)
  END;

-- Step 4: Set the new JSONB default
ALTER TABLE public.institutions
  ALTER COLUMN stream_definitions SET DEFAULT '[]'::jsonb;

-- Step 5: Re-add the camelCase alias as JSONB
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS "streamDefinitions" JSONB DEFAULT '[]'::jsonb;

-- Step 6: Sync camelCase alias from the snake_case column
UPDATE public.institutions
  SET "streamDefinitions" = COALESCE(stream_definitions, '[]'::jsonb)
  WHERE "streamDefinitions" IS NULL OR "streamDefinitions" = '[]'::jsonb;

-- Step 7: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
