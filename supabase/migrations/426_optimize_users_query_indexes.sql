-- Migration 426: Optimize users table indexing for tenant query performance
-- Purpose: Permanently eliminate query bottlenecks when filtering users by institution_id, role, and id

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_users_inst_id_composite ON public.users (institution_id, id);
        CREATE INDEX IF NOT EXISTS idx_users_inst_role_id ON public.users (institution_id, role, id);
        CREATE INDEX IF NOT EXISTS idx_users_inst_created_desc ON public.users (institution_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_users_role_inst ON public.users (role, institution_id);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
