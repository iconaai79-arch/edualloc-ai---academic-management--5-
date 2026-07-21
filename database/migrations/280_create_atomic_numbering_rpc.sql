-- Migration: 280_create_atomic_numbering_rpc.sql
-- Description: Create public.get_next_document_number function that handles concurrent, safe increments of document numbers using row-level locking.

CREATE OR REPLACE FUNCTION public.get_next_document_number(
    p_institution_id TEXT,
    p_document_type TEXT
) RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_next_number INT;
    v_default_prefix TEXT;
BEGIN
    -- Determine default prefix based on document type
    CASE p_document_type
        WHEN 'invoice' THEN v_default_prefix := 'INV-';
        WHEN 'receipt' THEN v_default_prefix := 'REC-';
        WHEN 'payment_voucher' THEN v_default_prefix := 'PV-';
        WHEN 'credit_note' THEN v_default_prefix := 'CN-';
        WHEN 'debit_note' THEN v_default_prefix := 'DN-';
        WHEN 'goods_in_lieu' THEN v_default_prefix := 'GIL-';
        ELSE v_default_prefix := 'DOC-';
    END CASE;

    -- Ensure a record exists first (DO NOTHING if it already exists due to unique constraint)
    INSERT INTO public.finance_numbering_configs (
        id, institution_id, document_type, prefix, next_number, updated_at
    ) VALUES (
        'num_cfg_' || p_document_type || '_' || p_institution_id || '_' || extract(epoch from now())::text,
        p_institution_id,
        p_document_type,
        v_default_prefix,
        1001,
        now()
    )
    ON CONFLICT (institution_id, document_type) DO NOTHING;

    -- Select and lock the row to update it atomically (blocks concurrent reads until commit)
    SELECT prefix, next_number INTO v_prefix, v_next_number
    FROM public.finance_numbering_configs
    WHERE institution_id = p_institution_id AND document_type = p_document_type
    FOR UPDATE;

    -- Increment the number in the database for the next caller
    UPDATE public.finance_numbering_configs
    SET next_number = v_next_number + 1, updated_at = now()
    WHERE institution_id = p_institution_id AND document_type = p_document_type;

    RETURN v_prefix || v_next_number::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
