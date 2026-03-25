-- Migration: Add support for modular trials and subscriptions
CREATE TABLE IF NOT EXISTS institution_module_states (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL, -- e.g., 'inventory', 'library', 'boarding', 'his', 'coop'
    status TEXT NOT NULL DEFAULT 'inactive', -- 'inactive', 'trial', 'active', 'expired', 'suspended'
    activated_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(institution_id, module_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_ims_institution_id ON institution_module_states(institution_id);

-- Enable RLS
ALTER TABLE institution_module_states ENABLE ROW LEVEL SECURITY;

-- Policy: Institutions can see their own module states
CREATE POLICY "Institutions can view their own module states"
ON institution_module_states FOR SELECT
TO authenticated
USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

-- Policy: Super Admins can manage all
CREATE POLICY "Super Admins can manage all module states"
ON institution_module_states FOR ALL
TO authenticated
USING (public.get_curr_user_role() = 'super_admin');
