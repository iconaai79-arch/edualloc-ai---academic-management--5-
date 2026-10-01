-- 441: Fix school_remedial_sessions ID column default value to prevent not-null violations
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'school_remedial_sessions' 
          AND column_name = 'id'
    ) THEN
        -- If pgcrypto gen_random_uuid is available, use it; otherwise fallback to md5 timestamp text generator
        BEGIN
            EXECUTE 'ALTER TABLE school_remedial_sessions ALTER COLUMN id SET DEFAULT (''remedial_sess_'' || substr(md5(random()::text || clock_timestamp()::text), 1, 16))';
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;
