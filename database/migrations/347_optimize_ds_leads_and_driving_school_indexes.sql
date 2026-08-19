-- 347. OPTIMIZE DS_LEADS AND DRIVING SCHOOL TABLE INDEXES
-- Resolves Postgres error 57014 (canceling statement due to statement timeout)
-- Adds performance indexes for tenant-scoped lookups, date ranges, and status filtering.

-- ==========================================
-- 1. DS_LEADS INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_ds_leads_institution_id ON public.ds_leads(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_leads_created_at ON public.ds_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ds_leads_inst_created ON public.ds_leads(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ds_leads_phone ON public.ds_leads(phone);
CREATE INDEX IF NOT EXISTS idx_ds_leads_status ON public.ds_leads(status);
CREATE INDEX IF NOT EXISTS idx_ds_leads_broadcast_id ON public.ds_leads(broadcast_id);

-- ==========================================
-- 2. DRIVING SCHOOL CORE TABLES INDEXES
-- ==========================================
-- ds_students
CREATE INDEX IF NOT EXISTS idx_ds_students_institution_id ON public.ds_students(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_students_created_at ON public.ds_students(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ds_students_inst_status ON public.ds_students(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_ds_students_phone ON public.ds_students(phone);

-- ds_lessons
CREATE INDEX IF NOT EXISTS idx_ds_lessons_institution_id ON public.ds_lessons(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_lessons_inst_date ON public.ds_lessons(institution_id, lesson_date);
CREATE INDEX IF NOT EXISTS idx_ds_lessons_instructor ON public.ds_lessons(instructor_id);
CREATE INDEX IF NOT EXISTS idx_ds_lessons_vehicle ON public.ds_lessons(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ds_lessons_status ON public.ds_lessons(status);

-- ds_invoices & ds_payments
CREATE INDEX IF NOT EXISTS idx_ds_invoices_institution_id ON public.ds_invoices(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_invoices_inst_date ON public.ds_invoices(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ds_invoices_status ON public.ds_invoices(status);

CREATE INDEX IF NOT EXISTS idx_ds_payments_institution_id ON public.ds_payments(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_date ON public.ds_payments(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ds_payments_student ON public.ds_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_ds_payments_invoice ON public.ds_payments(invoice_id);

-- ds_vehicles & ds_instructors & ds_skill_mastery
CREATE INDEX IF NOT EXISTS idx_ds_vehicles_institution_id ON public.ds_vehicles(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_instructors_institution_id ON public.ds_instructors(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_skill_mastery_institution_id ON public.ds_skill_mastery(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_skill_mastery_student ON public.ds_skill_mastery(student_id);

-- ds_expenditures & ds_settings
CREATE INDEX IF NOT EXISTS idx_ds_expenditures_inst_date ON public.ds_expenditures(institution_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_ds_settings_institution_id ON public.ds_settings(institution_id);

-- Update statistics for query optimizer
ANALYZE public.ds_leads;
ANALYZE public.ds_students;
ANALYZE public.ds_lessons;
ANALYZE public.ds_invoices;
ANALYZE public.ds_payments;
