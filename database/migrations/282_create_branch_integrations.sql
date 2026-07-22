-- Migration: 282_create_branch_integrations.sql
-- Description: Create public.branch_integration_configs table to hold branch-specific payment gateway and bank account settings.

CREATE TABLE IF NOT EXISTS public.branch_integration_configs (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'kcb', 'ncba', 'mpesa', 'coop', etc.
    account_details JSONB NOT NULL DEFAULT '{}'::jsonb, -- credentials and bank accounts info
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_branch_provider UNIQUE (branch_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_branch_integration_configs_branch ON public.branch_integration_configs(branch_id);
