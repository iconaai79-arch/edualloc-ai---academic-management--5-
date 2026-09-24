-- Migration: 419_fix_document_numbering_rpc_and_sanitize_admission.sql
-- Description: Fix get_next_document_number to support admission/student, flexible inst_ prefixes, sanitize phone-number-corrupted sequences, and reset any next_number >= 1,000,000 back to 1001.

-- 1. Sanitize any rows corrupted by phone numbers or epoch timestamps (>= 1,000,000)
UPDATE public.finance_numbering_configs
SET next_number = 1001,
    updated_at = now()
WHERE next_number >= 1000000;

-- 2. Update get_next_document_number RPC with complete document types, flexible tenancy match, and sanity capping
CREATE OR REPLACE FUNCTION public.get_next_document_number(
    p_institution_id TEXT,
    p_document_type TEXT
) RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_next_number INT;
    v_default_prefix TEXT;
    v_clean_inst_id TEXT;
    v_target_inst_id TEXT;
    v_target_id TEXT;
BEGIN
    v_clean_inst_id := regexp_replace(p_institution_id, '^inst_', '');

    -- Determine default prefix based on document type
    CASE lower(p_document_type)
        WHEN 'invoice' THEN v_default_prefix := 'INV-';
        WHEN 'receipt' THEN v_default_prefix := 'REC-';
        WHEN 'payment_voucher' THEN v_default_prefix := 'PV-';
        WHEN 'credit_note' THEN v_default_prefix := 'CN-';
        WHEN 'debit_note' THEN v_default_prefix := 'DN-';
        WHEN 'goods_in_lieu' THEN v_default_prefix := 'GIL-';
        WHEN 'lpo' THEN v_default_prefix := 'LPO-';
        WHEN 'requisition' THEN v_default_prefix := 'REQ-';
        WHEN 'admission' THEN v_default_prefix := 'ADM-';
        WHEN 'student' THEN v_default_prefix := 'ADM-';
        WHEN 'quote' THEN v_default_prefix := 'QUO-';
        WHEN 'quotation' THEN v_default_prefix := 'QUO-';
        ELSE v_default_prefix := 'DOC-';
    END CASE;

    -- Ensure a record exists first (DO NOTHING if it already exists due to unique constraint)
    INSERT INTO public.finance_numbering_configs (
        id, institution_id, document_type, prefix, next_number, updated_at
    ) VALUES (
        'num_cfg_' || lower(p_document_type) || '_' || v_clean_inst_id,
        p_institution_id,
        lower(p_document_type),
        v_default_prefix,
        1001,
        now()
    )
    ON CONFLICT (institution_id, document_type) DO NOTHING;

    -- Select and lock the row to update it atomically
    SELECT id, institution_id, prefix, next_number
    INTO v_target_id, v_target_inst_id, v_prefix, v_next_number
    FROM public.finance_numbering_configs
    WHERE (institution_id = p_institution_id OR institution_id = v_clean_inst_id OR institution_id = 'inst_' || v_clean_inst_id)
      AND (lower(document_type) = lower(p_document_type) OR
           (lower(p_document_type) IN ('admission', 'student') AND lower(document_type) IN ('admission', 'student')))
    ORDER BY updated_at DESC
    LIMIT 1
    FOR UPDATE;

    -- Sanity check: If sequence is corrupted by a phone number or epoch timestamp (>= 1,000,000), reset to 1001
    IF v_next_number IS NULL OR v_next_number >= 1000000 THEN
        v_next_number := 1001;
    END IF;

    IF v_prefix IS NULL OR v_prefix = '' THEN
        v_prefix := v_default_prefix;
    END IF;

    -- Increment the number in the database for the next caller
    IF v_target_id IS NOT NULL THEN
        UPDATE public.finance_numbering_configs
        SET next_number = v_next_number + 1, updated_at = now()
        WHERE id = v_target_id;
    END IF;

    RETURN v_prefix || v_next_number::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
