-- 425_optimize_teacher_check_ins_indexes.sql
-- Optimizes indexing for teacher_check_ins table for rapid tenancy filtering and date ordering

CREATE INDEX IF NOT EXISTS idx_teacher_check_ins_inst_date ON public.teacher_check_ins (institution_id, check_in_date DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_check_ins_teacher_date ON public.teacher_check_ins (teacher_id, check_in_date DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_check_ins_date_desc ON public.teacher_check_ins (check_in_date DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_check_ins_created_at ON public.teacher_check_ins (created_at DESC);
