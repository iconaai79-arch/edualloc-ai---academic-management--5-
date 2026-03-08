-- 073_fix_bed_allocation_rpc_with_status_update.sql
-- Updates the create_bed_allocation RPC function to also explicitly update
-- the bed's status to 'Occupied' after a successful allocation.
-- This ensures the bed status is correct even if the trigger is not firing.

CREATE OR REPLACE FUNCTION public.create_bed_allocation(allocation_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
    v_bed_id TEXT;
    v_status TEXT;
BEGIN
    v_bed_id := allocation_data->>'bed_id';
    v_status := COALESCE(allocation_data->>'status', 'Active');

    -- Insert the allocation record
    INSERT INTO public.bed_allocations (
        id,
        bed_id,
        student_id,
        institution_id,
        allocated_by,
        allocation_date,
        term,
        academic_year,
        status,
        notes
    )
    VALUES (
        allocation_data->>'id',
        v_bed_id,
        allocation_data->>'student_id',
        allocation_data->>'institution_id',
        allocation_data->>'allocated_by',
        COALESCE((allocation_data->>'allocation_date')::DATE, CURRENT_DATE),
        allocation_data->>'term',
        allocation_data->>'academic_year',
        v_status,
        allocation_data->>'notes'
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
    RETURNING to_jsonb(bed_allocations.*) INTO result;

    -- Explicitly update bed status (in case trigger is not working)
    IF v_status = 'Active' THEN
        UPDATE public.boarding_beds
        SET status = 'Occupied', updated_at = CURRENT_TIMESTAMP
        WHERE id = v_bed_id;
    ELSIF v_status IN ('Completed', 'Transferred', 'Cancelled') THEN
        UPDATE public.boarding_beds
        SET status = 'Available', updated_at = CURRENT_TIMESTAMP
        WHERE id = v_bed_id;
    END IF;

    RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_bed_allocation(jsonb) TO authenticated;
