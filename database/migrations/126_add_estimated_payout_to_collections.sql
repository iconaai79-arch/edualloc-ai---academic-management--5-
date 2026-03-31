-- Migration: Add estimated_payout to Coop Collections
-- Description: Adds the _estimated_payout column to the coop_collections table to resolve schema cache errors.

-- Add column if not exists
ALTER TABLE public.coop_collections 
ADD COLUMN IF NOT EXISTS _estimated_payout NUMERIC(15, 2) DEFAULT 0.00;

-- Optionally, we can also add a non-underscore version for standard access
ALTER TABLE public.coop_collections 
ADD COLUMN IF NOT EXISTS estimated_payout NUMERIC(15, 2) DEFAULT 0.00;

-- Comment for documentation
COMMENT ON COLUMN public.coop_collections._estimated_payout IS 'Pre-calculated estimated payout for this collection record.';
COMMENT ON COLUMN public.coop_collections.estimated_payout IS 'Standard alias for _estimated_payout.';
