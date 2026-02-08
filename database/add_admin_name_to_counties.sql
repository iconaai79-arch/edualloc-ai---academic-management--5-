-- Migration to add admin_name to counties table
-- Run this if you need to switch from strict user linking to free text admin names

ALTER TABLE counties ADD COLUMN IF NOT EXISTS admin_name TEXT;

-- Move data from admin_id alias to admin_name if needed (optional)
-- UPDATE counties c
-- SET admin_name = u.name
-- FROM users u
-- WHERE c.admin_id = u.id
-- AND c.admin_name IS NULL;
