-- Migration: Add missing stamps_for_free_wash column to carwash_customers
ALTER TABLE carwash_customers ADD COLUMN IF NOT EXISTS stamps_for_free_wash INTEGER DEFAULT 10;
