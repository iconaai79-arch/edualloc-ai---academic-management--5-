-- 071_create_bed_allocation_rpc.sql
-- Creates a SECURITY DEFINER RPC function to bypass RLS on bed_allocations.
-- Called from the frontend via supabase.rpc('create_bed_allocation', ...)

CREATE OR REPLACE FUNCTION public.create_bed_allocation(allocation_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
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
        allocation_data->>'bed_id',
        allocation_data->>'student_id',
        allocation_data->>'institution_id',
        allocation_data->>'allocated_by',
        COALESCE((allocation_data->>'allocation_date')::DATE, CURRENT_DATE),
        allocation_data->>'term',
        allocation_data->>'academic_year',
        COALESCE(allocation_data->>'status', 'Active'),
        allocation_data->>'notes'
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
    RETURNING to_jsonb(bed_allocations.*) INTO result;

    RETURN result;
END;
$$;

-- Grant execute to all authenticated users
GRANT EXECUTE ON FUNCTION public.create_bed_allocation(jsonb) TO authenticated;
