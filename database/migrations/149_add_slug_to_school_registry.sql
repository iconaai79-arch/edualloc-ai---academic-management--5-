
-- Fix: Add missing slug column to school_registry table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='school_registry' AND column_name='slug') THEN
        ALTER TABLE school_registry ADD COLUMN slug VARCHAR(255) UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_school_registry_slug ON school_registry(slug);
    END IF;
END $$;
