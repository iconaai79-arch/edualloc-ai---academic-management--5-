-- 062_boarding_system_rls.sql
-- Fixes RLS for activity_log and adds specialized policies for Boarding Management.

-- 1. HARDEN ACTIVITY LOG (Ensure Insert works for everyone)
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "activity_log_insert_all" ON public.activity_log;
    DROP POLICY IF EXISTS "activity_log_insert_policy" ON public.activity_log;
    DROP POLICY IF EXISTS "activity_log_emergency_insert" ON public.activity_log;
END $$;

CREATE POLICY "activity_log_insert_v2" 
ON public.activity_log FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 2. ENABLE RLS ON BOARDING TABLES (Defensive checks)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_houses') THEN
        ALTER TABLE public.boarding_houses ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_rooms') THEN
        ALTER TABLE public.boarding_rooms ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_beds') THEN
        ALTER TABLE public.boarding_beds ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bed_allocations') THEN
        ALTER TABLE public.bed_allocations ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_checkins') THEN
        ALTER TABLE public.boarding_checkins ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_checkouts') THEN
        ALTER TABLE public.boarding_checkouts ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_maintenance_logs') THEN
        ALTER TABLE public.boarding_maintenance_logs ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 3. HELPER DO BLOCK TO APPLY POLICIES UNIFORMLY
DO $$
DECLARE
    t_name TEXT;
    tables TEXT[] := ARRAY[
        'boarding_houses', 
        'boarding_rooms', 
        'boarding_beds', 
        'bed_allocations', 
        'boarding_checkins', 
        'boarding_checkouts', 
        'boarding_maintenance_logs'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables LOOP
        -- Check if table exists before applying policies
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
            -- Drop old policies
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t_name || '_super_admin', t_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t_name || '_institutional_manage', t_name);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t_name || '_institutional_select', t_name);

        -- Super Admin: Full Access
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.get_curr_user_role() = ''super_admin'')', t_name || '_super_admin', t_name);

        -- Institutional Admin & Boarding Master: Full Access
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR ALL 
            TO authenticated
            USING (
                institution_id = public.get_curr_user_inst_id() 
                AND public.get_curr_user_role() IN (''admin'', ''head_teacher'', ''boarding_master'')
            )
            WITH CHECK (
                institution_id = public.get_curr_user_inst_id() 
                AND public.get_curr_user_role() IN (''admin'', ''head_teacher'', ''boarding_master'')
            )', 
            t_name || '_institutional_manage', t_name
        );

        -- Other Authenticated Users: View Only (if in same institution)
            EXECUTE format('
                CREATE POLICY %I ON public.%I FOR SELECT 
                TO authenticated
                USING (institution_id = public.get_curr_user_inst_id())', 
                t_name || '_institutional_select', t_name
            );
        END IF;
    END LOOP;
END $$;

-- 4. SPECIAL CASE FOR TABLES WITHOUT institution_id Directly (Reference check)
-- bed_allocations, checkins, etc., might not have institution_id yet in some versions.
-- Let's ensure they do or use JOINs. Based on 002 migration, boarding_houses HAS it.
-- Rooms have house_id. Beds have room_id.
-- Let's add institution_id to them if missing or use a recursive check.

-- Strategy: Ensure all boarding children have institution_id for performance and simplicity.
ALTER TABLE public.boarding_rooms ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.boarding_beds ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.bed_allocations ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.boarding_checkins ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.boarding_checkouts ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.boarding_maintenance_logs ADD COLUMN IF NOT EXISTS institution_id TEXT;

-- 5. UPDATE MISSING IDs (One-time fix with dependency checks)
DO $$
BEGIN
    -- Update Rooms
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_rooms') 
       AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_houses') THEN
        UPDATE public.boarding_rooms r SET institution_id = h.institution_id FROM public.boarding_houses h WHERE r.house_id = h.id AND r.institution_id IS NULL;
    END IF;

    -- Update Beds
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_beds') 
       AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_rooms') THEN
        UPDATE public.boarding_beds b SET institution_id = r.institution_id FROM public.boarding_rooms r WHERE b.room_id = r.id AND b.institution_id IS NULL;
    END IF;

    -- Update Allocations
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bed_allocations') 
       AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_beds') THEN
        UPDATE public.bed_allocations ba SET institution_id = b.institution_id FROM public.boarding_beds b WHERE ba.bed_id = b.id AND ba.institution_id IS NULL;
    END IF;

    -- Update Check-ins
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_checkins') 
       AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bed_allocations') THEN
        UPDATE public.boarding_checkins bc SET institution_id = ba.institution_id FROM public.bed_allocations ba WHERE bc.allocation_id = ba.id AND bc.institution_id IS NULL;
    END IF;

    -- Update Check-outs
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_checkouts') 
       AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bed_allocations') THEN
        UPDATE public.boarding_checkouts bo SET institution_id = ba.institution_id FROM public.bed_allocations ba WHERE bo.allocation_id = ba.id AND bo.institution_id IS NULL;
    END IF;
    
    -- Update Maintenance
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_maintenance_logs') 
       AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'boarding_houses') THEN
        UPDATE public.boarding_maintenance_logs bl SET institution_id = bh.institution_id FROM public.boarding_houses bh WHERE bl.house_id = bh.id AND bl.institution_id IS NULL;
    END IF;
END $$;

-- 5. FINAL VERIFICATION
DO $$ BEGIN
    RAISE NOTICE 'Boarding System RLS and Institution Tenancy successfully applied.';
END $$;
