-- Migration 350: Add source column to retail_inventory_items
ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS source text;
