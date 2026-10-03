-- Migration 447: Ensure boarding houses, rooms, beds, and bed_allocations exist in public schema
-- Resolves: "[API GET] Table 'bed_allocations' not in DB schema cache, returning empty list."

DO $$
BEGIN
    -- 1. BOARDING HOUSES
    CREATE TABLE IF NOT EXISTS public.boarding_houses (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        gender VARCHAR(20) NOT NULL DEFAULT 'Mixed',
        capacity INTEGER NOT NULL DEFAULT 50,
        house_master_id TEXT,
        status VARCHAR(30) DEFAULT 'Active',
        floor_plan_url TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_boarding_houses_inst ON public.boarding_houses(institution_id);

    -- 2. BOARDING ROOMS
    CREATE TABLE IF NOT EXISTS public.boarding_rooms (
        id TEXT PRIMARY KEY,
        institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
        house_id TEXT NOT NULL REFERENCES public.boarding_houses(id) ON DELETE CASCADE,
        room_number VARCHAR(50) NOT NULL,
        room_type VARCHAR(30) NOT NULL DEFAULT 'Dormitory',
        capacity INTEGER NOT NULL DEFAULT 4,
        floor_level INTEGER DEFAULT 0,
        amenities TEXT,
        status VARCHAR(30) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_boarding_rooms_house ON public.boarding_rooms(house_id);
    CREATE INDEX IF NOT EXISTS idx_boarding_rooms_inst ON public.boarding_rooms(institution_id);

    -- 3. BOARDING BEDS
    CREATE TABLE IF NOT EXISTS public.boarding_beds (
        id TEXT PRIMARY KEY,
        institution_id TEXT REFERENCES public.institutions(id) ON DELETE CASCADE,
        room_id TEXT NOT NULL REFERENCES public.boarding_rooms(id) ON DELETE CASCADE,
        bed_number VARCHAR(50) NOT NULL,
        status VARCHAR(30) DEFAULT 'Available',
        condition VARCHAR(30) DEFAULT 'Good',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_boarding_beds_room ON public.boarding_beds(room_id);
    CREATE INDEX IF NOT EXISTS idx_boarding_beds_inst ON public.boarding_beds(institution_id);

    -- 4. BED ALLOCATIONS TABLE
    CREATE TABLE IF NOT EXISTS public.bed_allocations (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
        bed_id TEXT NOT NULL REFERENCES public.boarding_beds(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL,
        allocated_by TEXT,
        allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
        term VARCHAR(20) DEFAULT 'Term 1',
        academic_year VARCHAR(20) DEFAULT '2026',
        status VARCHAR(30) DEFAULT 'Active',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_bed_allocations_inst ON public.bed_allocations(institution_id);
    CREATE INDEX IF NOT EXISTS idx_bed_allocations_bed ON public.bed_allocations(bed_id);
    CREATE INDEX IF NOT EXISTS idx_bed_allocations_student ON public.bed_allocations(student_id);
    CREATE INDEX IF NOT EXISTS idx_bed_allocations_status ON public.bed_allocations(status);

    -- 5. Enable RLS
    ALTER TABLE public.boarding_houses ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.boarding_rooms ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.boarding_beds ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.bed_allocations ENABLE ROW LEVEL SECURITY;

    -- 6. Apply standard tenancy policies
    DROP POLICY IF EXISTS "Institutional tenancy select: bed_allocations" ON public.bed_allocations;
    CREATE POLICY "Institutional tenancy select: bed_allocations" ON public.bed_allocations 
    FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

    DROP POLICY IF EXISTS "Institutional tenancy manage: bed_allocations" ON public.bed_allocations;
    CREATE POLICY "Institutional tenancy manage: bed_allocations" ON public.bed_allocations 
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

    DROP POLICY IF EXISTS "Institutional tenancy select: boarding_houses" ON public.boarding_houses;
    CREATE POLICY "Institutional tenancy select: boarding_houses" ON public.boarding_houses 
    FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

    DROP POLICY IF EXISTS "Institutional tenancy manage: boarding_houses" ON public.boarding_houses;
    CREATE POLICY "Institutional tenancy manage: boarding_houses" ON public.boarding_houses 
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

    DROP POLICY IF EXISTS "Institutional tenancy select: boarding_rooms" ON public.boarding_rooms;
    CREATE POLICY "Institutional tenancy select: boarding_rooms" ON public.boarding_rooms 
    FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

    DROP POLICY IF EXISTS "Institutional tenancy manage: boarding_rooms" ON public.boarding_rooms;
    CREATE POLICY "Institutional tenancy manage: boarding_rooms" ON public.boarding_rooms 
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

    DROP POLICY IF EXISTS "Institutional tenancy select: boarding_beds" ON public.boarding_beds;
    CREATE POLICY "Institutional tenancy select: boarding_beds" ON public.boarding_beds 
    FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

    DROP POLICY IF EXISTS "Institutional tenancy manage: boarding_beds" ON public.boarding_beds;
    CREATE POLICY "Institutional tenancy manage: boarding_beds" ON public.boarding_beds 
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

    -- Grant access
    GRANT ALL ON public.boarding_houses TO anon, authenticated, service_role;
    GRANT ALL ON public.boarding_rooms TO anon, authenticated, service_role;
    GRANT ALL ON public.boarding_beds TO anon, authenticated, service_role;
    GRANT ALL ON public.bed_allocations TO anon, authenticated, service_role;
END $$;

-- 7. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
