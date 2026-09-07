-- Migration 373: Add entry_time and exit_time columns to visitors table
-- Description: Ensures entry_time and exit_time columns exist on public.visitors to avoid schema cache stale warnings

ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS entry_time TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS exit_time TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
