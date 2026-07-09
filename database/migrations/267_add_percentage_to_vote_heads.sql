-- Migration: Add percentage support to vote_heads table
-- Path: database/migrations/267_add_percentage_to_vote_heads.sql

ALTER TABLE public.vote_heads ADD COLUMN IF NOT EXISTS is_percentage BOOLEAN DEFAULT FALSE;
ALTER TABLE public.vote_heads ADD COLUMN IF NOT EXISTS percentage DOUBLE PRECISION DEFAULT 0.0;
