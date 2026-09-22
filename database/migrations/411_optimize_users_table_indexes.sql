-- Migration 411: Add composite indexes for users table to eliminate statement timeouts
-- Purpose: Accelerate queries filtering by institution_id, role, and ordering by id or created_at

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_users_inst_id ON public.users(institution_id);
        CREATE INDEX IF NOT EXISTS idx_users_inst_id_composite ON public.users(institution_id, id);
        CREATE INDEX IF NOT EXISTS idx_users_inst_role ON public.users(institution_id, role);
        CREATE INDEX IF NOT EXISTS idx_users_inst_created ON public.users(institution_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
