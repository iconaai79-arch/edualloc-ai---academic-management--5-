-- =========================================================================
-- NCBA CONFIGURATION UPDATE SCRIPT FOR TALKSASA POSTGRESQL
-- Only requires Username and Secret Key (set once in the DECLARE block below)
-- File: database/update_ncba_settings.sql
-- =========================================================================

DO $$
DECLARE
    -- ONLY EDIT THESE TWO FIELDS:
    v_username   CONSTANT TEXT := 'YOUR_NCBA_USERNAME';
    v_secret_key CONSTANT TEXT := 'YOUR_NCBA_SECRET_KEY';
    v_paybill    CONSTANT TEXT := '880100';
    v_account    CONSTANT TEXT := '272487';
    v_base_url   CONSTANT TEXT := 'https://c2bapis.ncbagroup.com';
    v_cfg        JSONB;
BEGIN
    -- 1. Ensure the ncba_config columns exist on system_settings and institutions
    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS ncba_config JSONB;
    ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS ncba_config JSONB;
    ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "ncbaConfig" JSONB;

    -- 2. Ensure row '1' exists in system_settings
    INSERT INTO public.system_settings (id, data, updated_at)
    VALUES ('1', '{}'::jsonb, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING;

    -- 3. Build unified config object from Username & Secret Key
    v_cfg := jsonb_build_object(
        'username', v_username,
        'secret_key', v_secret_key,
        'secretKey', v_secret_key,
        'client_id', v_username,
        'clientId', v_username,
        'client_secret', v_secret_key,
        'clientSecret', v_secret_key,
        'password', v_secret_key,
        'base_url', v_base_url,
        'baseUrl', v_base_url,
        'environment', 'production',
        'paybill', v_paybill,
        'paybillNumber', v_paybill,
        'accountNumber', v_account,
        'account_number', v_account
    );

    -- 4. Update global system_settings (matches '1' or 'global' safely as TEXT)
    UPDATE public.system_settings
    SET 
        ncba_config = v_cfg,
        data = jsonb_set(
            jsonb_set(COALESCE(data, '{}'::jsonb), '{ncba_config}', v_cfg, true),
            '{ncbaConfig}', v_cfg, true
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id::text IN ('1', 'global');
END $$;

-- Verify the updated configuration
SELECT 
    id,
    data->'ncbaConfig'->>'username' AS ncba_username,
    data->'ncbaConfig'->>'paybill' AS paybill,
    data->'ncbaConfig'->>'accountNumber' AS account_number,
    data->'ncbaConfig'->>'baseUrl' AS base_url
FROM public.system_settings 
WHERE id::text IN ('1', 'global');
