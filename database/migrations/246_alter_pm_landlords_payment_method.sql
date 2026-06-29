-- Migration: 246_alter_pm_landlords_payment_method
-- Description: Adds preferred_payment_method column to pm_landlords table.

ALTER TABLE pm_landlords ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT;
