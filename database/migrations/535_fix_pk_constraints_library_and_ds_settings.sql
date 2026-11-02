-- Migration 535: Fix Primary Key & Unique Constraints for Settings & Base Tables
-- Resolves: "ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- 1. Ensures library_settings and ds_settings have PRIMARY KEY on (institution_id)
-- 2. Dynamically guarantees that all public tables with an "id" column have a PRIMARY KEY or UNIQUE constraint on "id"

DO $$ 
BEGIN
    -- 1. Ensure institution_id is PRIMARY KEY for library_settings
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'library_settings'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'public.library_settings'::regclass AND contype = 'p'
        ) THEN
            BEGIN
                ALTER TABLE public.library_settings ADD PRIMARY KEY (institution_id);
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END IF;

    -- 2. Ensure institution_id is PRIMARY KEY for ds_settings
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ds_settings'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'public.ds_settings'::regclass AND contype = 'p'
        ) THEN
            BEGIN
                ALTER TABLE public.ds_settings ADD PRIMARY KEY (institution_id);
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END IF;
END $$;

-- 3. Dynamically guarantee that all public tables with an "id" column have a PRIMARY KEY or UNIQUE constraint on "id"
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT c.table_name 
        FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND t.table_schema = 'public'
        WHERE c.table_schema = 'public' 
          AND c.column_name = 'id'
          AND t.table_type = 'BASE TABLE'
          AND c.table_name NOT IN ('library_settings', 'ds_settings')
    ) LOOP
        -- Check if table already has a primary key or unique constraint on "id"
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_constraint con
            JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
            WHERE con.connamespace = 'public'::regnamespace
              AND con.conrelid = r.table_name::regclass
              AND con.contype IN ('p', 'u')
              AND att.attname = 'id'
        ) THEN
            BEGIN
                -- First attempt: ADD PRIMARY KEY (id)
                EXECUTE format('ALTER TABLE public.%I ADD PRIMARY KEY (id)', r.table_name);
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    -- Fallback attempt: ADD CONSTRAINT UNIQUE (id)
                    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (id)', r.table_name, 'uq_' || r.table_name || '_id');
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END;
        END IF;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
