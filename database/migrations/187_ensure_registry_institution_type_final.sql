-- 187_ensure_registry_institution_type_final.sql
-- Force ensuring the institution_type column exists and reloading schema cache

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'school_registry') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_registry' AND column_name = 'institution_type') THEN
            ALTER TABLE school_registry ADD COLUMN institution_type VARCHAR(255) DEFAULT 'Secondary';
        END IF;
    END IF;
END $$;

-- Force API Schema Refresh
NOTIFY pgrst, 'reload schema';
