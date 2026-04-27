-- 182_add_institution_type_to_registry.sql
-- Adding missing institution_type column to school_registry table

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'school_registry') THEN
        BEGIN
            ALTER TABLE school_registry ADD COLUMN IF NOT EXISTS institution_type VARCHAR(255) DEFAULT 'Secondary';
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'school_registry alteration encountered issues: %', SQLERRM;
        END;
    END IF;
END $$;

-- Force API Schema Refresh
NOTIFY pgrst, 'reload schema';
