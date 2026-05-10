-- Migration 205: Add capacity to ds_vehicles
ALTER TABLE ds_vehicles 
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1;
