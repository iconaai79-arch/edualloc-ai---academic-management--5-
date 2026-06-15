-- 231. MIGRATE STUDENT ENROLLMENTS PARENT METADATA
-- Converts legacy single-parent fields (parentName, parentPhone, parentEmail, parentRelation)
-- in the student_enrollments metadata column into the new polymorphic JSONB array format ('parents').

UPDATE student_enrollments
SET metadata = jsonb_set(
    metadata,
    '{parents}',
    jsonb_build_array(
        jsonb_build_object(
            'name', COALESCE(metadata->>'parentName', ''),
            'phone', COALESCE(metadata->>'parentPhone', ''),
            'email', COALESCE(metadata->>'parentEmail', ''),
            'relation', COALESCE(metadata->>'parentRelation', 'Father')
        )
    )
)
WHERE (metadata ? 'parentName' OR metadata ? 'parentPhone')
  AND NOT metadata ? 'parents';
