-- ========================================================
-- Truncate Driving School Invoices & Dependent Payments
-- Run this on Talksasa before importing your SQL backup dump
-- ========================================================

TRUNCATE TABLE public.ds_payments, public.ds_invoices CASCADE;

