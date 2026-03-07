-- diagnostic.sql
DO $$
DECLARE
    r RECORD;
    cnt INT;
BEGIN
    -- 1. Check if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_log') THEN
        RAISE NOTICE 'Table activity_log exists.';
    ELSE
        RAISE NOTICE 'Table activity_log DOES NOT exist!';
        RETURN;
    END IF;

    -- 2. Check RLS status
    SELECT relrowlock INTO r FROM pg_class WHERE relname = 'activity_log';
    SELECT count(*) INTO cnt FROM pg_class WHERE relname = 'activity_log' AND relrowsecurity = true;
    IF cnt > 0 THEN
        RAISE NOTICE 'RLS is ENABLED on activity_log.';
    ELSE
        RAISE NOTICE 'RLS is DISABLED on activity_log.';
    END IF;

    -- 3. Check policies
    FOR r IN SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'activity_log' LOOP
        RAISE NOTICE 'Policy: %, Roles: %, Cmd: %, Qual: %', r.policyname, r.roles, r.cmd, r.qual;
    END LOOP;

    -- 4. Check total count (bypass RLS for this check if possible, though DO block runs as current user)
    SELECT count(*) INTO cnt FROM public.activity_log;
    RAISE NOTICE 'Total row count (as current user): %', cnt;

    -- 5. Check column types
    FOR r IN SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'activity_log' LOOP
        RAISE NOTICE 'Column: %, Type: %', r.column_name, r.data_type;
    END LOOP;
END $$;
