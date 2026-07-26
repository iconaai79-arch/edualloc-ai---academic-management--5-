-- Migration 290: Create Family Heritage Totems Table
CREATE TABLE IF NOT EXISTS public.heritage_totems (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    totem_name TEXT,
    motto TEXT,
    totem_preset TEXT DEFAULT 'baobab',
    custom_image_url TEXT,
    animation_mode TEXT DEFAULT 'background_3d',
    rotation_speed TEXT DEFAULT 'slow',
    glow_color TEXT DEFAULT '#f59e0b',
    show_as_tree_root BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Foreign Key
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.heritage_totems ADD CONSTRAINT heritage_totems_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping heritage_totems FK due to type mismatch.';
    END;
END $$;

-- Enable RLS
ALTER TABLE public.heritage_totems ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Heritage Totems Read Policy" ON public.heritage_totems;
CREATE POLICY "Heritage Totems Read Policy" ON public.heritage_totems
    FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Heritage Totems Manage Policy" ON public.heritage_totems;
CREATE POLICY "Heritage Totems Manage Policy" ON public.heritage_totems
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');