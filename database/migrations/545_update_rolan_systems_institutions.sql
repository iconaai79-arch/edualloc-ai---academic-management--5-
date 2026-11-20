-- ==============================================================================
-- Migration 545: Restore & Link Institutions Managed by ROLAN SYSTEMS (Andrew Suter)
-- Reconstructed from Database Backup Analysis (eduai_full_database_backup_2026-11-03)
-- Target Reseller: ROLAN SYSTEMS (inst_1774425135021_uknou)
-- Contact: Andrew Suter (andrewsuter24@gmail.com / rolansoftwares001@gmail.com / 0725356174)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Ensure resilience columns & constraints on public.institutions
-- ------------------------------------------------------------------------------
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS reseller_id TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "resellerId" TEXT;
ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_reseller_id_fkey CASCADE;
ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS fk_institutions_reseller CASCADE;

-- ------------------------------------------------------------------------------
-- 2. Ensure ROLAN SYSTEMS reseller institution agency is active
-- ------------------------------------------------------------------------------
INSERT INTO public.institutions (
    id, 
    name, 
    email, 
    "phoneNumber", 
    "institutionType", 
    status, 
    "subscriptionEndsAt", 
    "institutionCode"
)
VALUES (
    'inst_1774425135021_uknou', 
    'ROLAN SYSTEMS', 
    'rolansoftwares001@gmail.com', 
    '0725356174', 
    'Reseller', 
    'active', 
    '2030-12-31T23:59:59.000Z', 
    '6TADFFT4'
)
ON CONFLICT (id) DO UPDATE SET
    "institutionType" = 'Reseller',
    status = 'active',
    "subscriptionEndsAt" = COALESCE(public.institutions."subscriptionEndsAt", EXCLUDED."subscriptionEndsAt");

-- ------------------------------------------------------------------------------
-- 3. Ensure Andrew Suter's reseller user login account exists with role 'reseller'
-- ------------------------------------------------------------------------------
INSERT INTO public.users (
    id, 
    name, 
    email, 
    "phoneNumber", 
    "staffId", 
    role, 
    "institutionId"
)
VALUES (
    'u_admin_1774425135021_9qt5a', 
    'ANDREW', 
    'andrewsuter24@gmail.com', 
    '0725356174', 
    'ADMIN-01', 
    'reseller', 
    'inst_1774425135021_uknou'
)
ON CONFLICT (id) DO UPDATE SET
    role = 'reseller',
    "institutionId" = 'inst_1774425135021_uknou';

-- Also ensure any user with rolan emails or phones is assigned reseller role if linked to rolan inst
UPDATE public.users
SET role = 'reseller'
WHERE "institutionId" = 'inst_1774425135021_uknou'
  AND role != 'reseller';

-- ------------------------------------------------------------------------------
-- 4. Explicitly link institutions managed by ROLAN SYSTEMS:
--    - inst_1788944502601_e4li8 : BUSIA TOWNSHIP
--    - inst_1779088292306_dbmvu : CHEBARA BOYS SENIOR SCHOOL
--    - inst_c2f7c826-a5d3-4e50-ac42-55cc4d6c771a : FELISSONS SCHOOL (Felisons School)
--    - inst_12c5501c-13fd-4290-b928-544af9b0b241 : Dwmo (Demo School)
--    - inst_6ed131dc-3498-437b-9082-76d93b481ffa : Admission / Test School (if present)
-- ------------------------------------------------------------------------------
UPDATE public.institutions
SET 
    reseller_id  = 'inst_1774425135021_uknou',
    "resellerId" = 'inst_1774425135021_uknou'
WHERE id IN (
    'inst_1788944502601_e4li8',                    -- BUSIA TOWNSHIP
    'inst_1779088292306_dbmvu',                    -- CHEBARA BOYS SENIOR SCHOOL
    'inst_c2f7c826-a5d3-4e50-ac42-55cc4d6c771a',  -- FELISSONS SCHOOL
    'inst_12c5501c-13fd-4290-b928-544af9b0b241',  -- Dwmo (Demo)
    'inst_6ed131dc-3498-437b-9082-76d93b481ffa'   -- Test / Admission
);

-- ------------------------------------------------------------------------------
-- 5. Dynamic fallback link: Catch any instances where name or user points to Rolan
-- ------------------------------------------------------------------------------
UPDATE public.institutions i
SET 
    reseller_id  = 'inst_1774425135021_uknou',
    "resellerId" = 'inst_1774425135021_uknou'
WHERE (i.reseller_id IS NULL OR i.reseller_id = '' OR i.reseller_id = 'inst_1774425135021_uknou')
  AND i.id != 'inst_1774425135021_uknou'
  AND (
    -- Matches by known school name variations
    LOWER(i.name) LIKE '%felisson%'
    OR LOWER(i.name) LIKE '%felison%'
    OR LOWER(i.name) LIKE '%chebara%'
    OR LOWER(i.name) LIKE '%busia township%'
    -- Or matches by contact information directly attached to institution
    OR LOWER(COALESCE(i.email, '')) = 'rolansoftwares001@gmail.com'
    OR LOWER(COALESCE(i.email, '')) = 'andrewsuter24@gmail.com'
    -- Or matches if registered admin belongs to Rolan
    OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u."institutionId" = i.id
          AND (
            LOWER(COALESCE(u.email, '')) IN ('rolansoftwares001@gmail.com', 'andrewsuter24@gmail.com')
            OR u."phoneNumber" IN ('0725356174', '+254725356174', '254725356174')
          )
    )
  );

-- ------------------------------------------------------------------------------
-- 6. Synchronize snake_case and camelCase column aliases across all institutions
-- ------------------------------------------------------------------------------
UPDATE public.institutions
SET "resellerId" = reseller_id
WHERE reseller_id IS NOT NULL 
  AND reseller_id <> ''
  AND ("resellerId" IS NULL OR "resellerId" <> reseller_id);

UPDATE public.institutions
SET reseller_id = "resellerId"
WHERE "resellerId" IS NOT NULL 
  AND "resellerId" <> ''
  AND (reseller_id IS NULL OR reseller_id <> "resellerId");

-- ------------------------------------------------------------------------------
-- 7. Verification: Output all institutions managed by ROLAN SYSTEMS
-- ------------------------------------------------------------------------------
SELECT 
    'inst_1774425135021_uknou' AS reseller_id,
    'ROLAN SYSTEMS'            AS reseller_name,
    t.id                       AS managed_institution_id,
    t.name                     AS managed_institution_name,
    t.email                    AS institution_email,
    t."phoneNumber"            AS institution_phone,
    t.status                   AS institution_status,
    t."subscriptionEndsAt"     AS subscription_valid_until
FROM public.institutions t
WHERE (t.reseller_id = 'inst_1774425135021_uknou' OR t."resellerId" = 'inst_1774425135021_uknou')
  AND t.id <> 'inst_1774425135021_uknou'
ORDER BY t.name ASC;

COMMIT;

-- ------------------------------------------------------------------------------
-- 8. Refresh PostgREST schema cache
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
