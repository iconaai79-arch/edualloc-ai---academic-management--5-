-- Migration: Add KCB Config to Institutions Table
-- Purpose: Support tenant-specific KCB Buni STK push configurations

ALTER TABLE institutions ADD COLUMN IF NOT EXISTS kcb_config JSONB;
