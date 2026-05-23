-- Migration 219: Add sold_by column to car_sales_invoices for salesperson tracking
ALTER TABLE public.car_sales_invoices ADD COLUMN IF NOT EXISTS sold_by TEXT;
