-- 076_backfill_bed_allocation_institution_ids.sql
-- Backfills the institution_id in bed_allocations from the users table.
-- This ensures that fetchBedAllocations can correctly filter records by institution.

UPDATE public.bed_allocations ba
SET institution_id = u.institution_id
FROM public.users u
WHERE ba.student_id = u.id
AND (ba.institution_id IS NULL OR ba.institution_id = '');

-- Also ensure future inserts via standard table operations have institution_id set
-- although the RPC already handles this.
ALTER TABLE public.bed_allocations ALTER COLUMN institution_id SET NOT NULL;
