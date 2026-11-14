-- =========================================================================
-- NCBA CONFIGURATION UPDATE SCRIPT FOR TALKSASA POSTGRESQL (FIXED)
-- File: database/update_ncba_settings.sql
-- =========================================================================

-- 1. Ensure the ncba_config columns exist on system_settings and institutions
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS ncba_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS ncba_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "ncbaConfig" JSONB;

-- 2. Ensure row '1' exists in system_settings
INSERT INTO public.system_settings (id, data, updated_at)
VALUES ('1', '{}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 3. Update global system_settings (matches '1' or 'global' safely as TEXT)
-- Stores credentials in both snake_case and camelCase to guarantee 100% compatibility across all services
UPDATE public.system_settings
SET 
    -- Direct column update
    ncba_config = jsonb_build_object(
        'client_id', 'YOUR_NCBA_CLIENT_ID',
        'clientId', 'YOUR_NCBA_CLIENT_ID',
        'client_secret', 'YOUR_NCBA_CLIENT_SECRET',
        'clientSecret', 'YOUR_NCBA_CLIENT_SECRET',
        'username', 'YOUR_NCBA_CLIENT_ID',
        'password', 'YOUR_NCBA_CLIENT_SECRET',
        'base_url', 'https://c2bapis.ncbagroup.com',
        'baseUrl', 'https://c2bapis.ncbagroup.com',
        'environment', 'production',
        'paybill', '880100',
        'paybillNumber', '880100',
        'accountNumber', '272487',
        'account_number', '272487'
    ),
    -- Update inside the data JSONB column as well
    data = jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{ncba_config}',
        jsonb_build_object(
            'client_id', 'YOUR_NCBA_CLIENT_ID',
            'clientId', 'YOUR_NCBA_CLIENT_ID',
            'client_secret', 'YOUR_NCBA_CLIENT_SECRET',
            'clientSecret', 'YOUR_NCBA_CLIENT_SECRET',
            'username', 'YOUR_NCBA_CLIENT_ID',
            'password', 'YOUR_NCBA_CLIENT_SECRET',
            'base_url', 'https://c2bapis.ncbagroup.com',
            'baseUrl', 'https://c2bapis.ncbagroup.com',
            'environment', 'production',
            'paybill', '880100',
            'paybillNumber', '880100',
            'accountNumber', '272487',
            'account_number', '272487'
        ),
        true
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE id::text IN ('1', 'global');

-- 4. Also synchronize into data->ncbaConfig (camelCase key used by frontend UI)
UPDATE public.system_settings
SET data = jsonb_set(
    data,
    '{ncbaConfig}',
    jsonb_build_object(
        'clientId', 'YOUR_NCBA_CLIENT_ID',
        'clientSecret', 'YOUR_NCBA_CLIENT_SECRET',
        'username', 'YOUR_NCBA_CLIENT_ID',
        'password', 'YOUR_NCBA_CLIENT_SECRET',
        'baseUrl', 'https://c2bapis.ncbagroup.com',
        'environment', 'production',
        'paybill', '880100',
        'accountNumber', '272487'
    ),
    true
)
WHERE id::text IN ('1', 'global');

-- 5. Verify the updated configuration
SELECT 
    id,
    data->'ncba_config' AS ncba_snake_case,
    data->'ncbaConfig' AS ncba_camel_case
FROM public.system_settings 
WHERE id::text IN ('1', 'global');
