-- 075_refine_allocation_check_scope.sql
-- Refines the create_bed_allocation RPC to scope the student-allocation check 
-- to the specific institution, avoiding global blocking.

CREATE OR REPLACE FUNCTION public.create_bed_allocation(allocation_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
    v_bed_id TEXT;
    v_student_id TEXT;
    v_institution_id TEXT;
    v_status TEXT;
    v_student_name TEXT;
BEGIN
    v_bed_id := allocation_data->>'bed_id';
    v_student_id := allocation_data->>'student_id';
    v_institution_id := allocation_data->>'institution_id';
    v_status := COALESCE(allocation_data->>'status', 'Active');

    -- Get student name for better error message
    SELECT name INTO v_student_name FROM public.users WHERE id = v_student_id;

    -- Security: Validate student is not already allocated WITHIN THIS INSTITUTION
    IF v_status = 'Active' AND EXISTS (
        SELECT 1 FROM public.bed_allocations 
        WHERE student_id = v_student_id 
        AND institution_id = v_institution_id
        AND status = 'Active' 
        AND id != COALESCE(allocation_data->>'id', '')
    ) THEN
        RAISE EXCEPTION 'Student % is already allocated to a bed in this institution', COALESCE(v_student_name, 'Selected student');
    END IF;

    -- Security: Validate bed is not already allocated
    IF v_status = 'Active' AND EXISTS (
        SELECT 1 FROM public.bed_allocations 
        WHERE bed_id = v_bed_id 
        AND status = 'Active' 
        AND id != COALESCE(allocation_data->>'id', '')
    ) THEN
        RAISE EXCEPTION 'Bed is already occupied by another student';
    END IF;

    -- Insert the allocation record
    INSERT INTO public.bed_allocations (
        id, bed_id, student_id, institution_id, allocated_by,
        allocation_date, term, academic_year, status, notes
    )
    VALUES (
        allocation_data->>'id',
        v_bed_id,
        v_student_id,
        v_institution_id,
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

    -- Explicitly update bed status
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
