-- Migration 382: Allow Global WhatsApp Configurations and Audit Logs
-- Description: Drops strict foreign key constraints on whatsapp_configs and whatsapp_logs to allow 'global' or 'system' institution_id for Super Admin platform-wide WhatsApp gateway.

DO $$
BEGIN
    -- 1. Relax foreign key on whatsapp_configs so 'global' and 'system' IDs can be used
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'whatsapp_configs_institution_id_fkey'
        AND table_name = 'whatsapp_configs'
    ) THEN
        ALTER TABLE public.whatsapp_configs DROP CONSTRAINT whatsapp_configs_institution_id_fkey;
    END IF;

    -- 2. Relax foreign key on whatsapp_logs so global/system dispatches can be logged
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'whatsapp_logs_institution_id_fkey'
        AND table_name = 'whatsapp_logs'
    ) THEN
        ALTER TABLE public.whatsapp_logs DROP CONSTRAINT whatsapp_logs_institution_id_fkey;
    END IF;
END $$;

-- 3. Add columns for global fallback & multi-tenant routing
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS allow_institution_failover BOOLEAN DEFAULT true;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS global_dispatch_enabled BOOLEAN DEFAULT true;

-- 4. Update RLS policies to permit access to global configs
DROP POLICY IF EXISTS "whatsapp_configs_isolation" ON public.whatsapp_configs;
CREATE POLICY "whatsapp_configs_isolation"
    ON public.whatsapp_configs
    FOR ALL
    USING (
        institution_id = 'global'
        OR institution_id = 'system'
        OR institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    )
    WITH CHECK (
        institution_id = 'global'
        OR institution_id = 'system'
        OR institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    );

DROP POLICY IF EXISTS "whatsapp_logs_isolation" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_isolation"
    ON public.whatsapp_logs
    FOR ALL
    USING (
        institution_id = 'global'
        OR institution_id = 'system'
        OR institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    )
    WITH CHECK (
        institution_id = 'global'
        OR institution_id = 'system'
        OR institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    );

-- 5. Seed default global WhatsApp config row if not present
INSERT INTO public.whatsapp_configs (
    id,
    institution_id,
    provider_type,
    gateway_url,
    instance_name,
    is_connected,
    allow_institution_failover,
    global_dispatch_enabled,
    auto_send_receipts,
    auto_send_fee_reminders,
    auto_send_academic_results
) VALUES (
    'wacfg_global',
    'global',
    'gateway',
    NULL,
    'eduai_master',
    false,
    true,
    true,
    true,
    false,
    false
) ON CONFLICT (id) DO UPDATE SET
    allow_institution_failover = EXCLUDED.allow_institution_failover,
    global_dispatch_enabled = EXCLUDED.global_dispatch_enabled;

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
