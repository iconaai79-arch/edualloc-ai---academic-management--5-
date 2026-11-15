-- ==============================================================================
-- Migration 521: Heal Remedial Module Quoted camelCase and Snake_Case Columns
-- Pure Standard SQL (NO PL/pgSQL DO $$ block) for 100% Web Importer Compatibility
-- ==============================================================================

-- 1. school_remedial_sessions
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "endTime" TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duration_hours NUMERIC;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "durationHours" TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS hours TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER DEFAULT 60;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'In Progress';
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS payout_id TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "payoutId" TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "date" TEXT;
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();

UPDATE public.school_remedial_sessions
SET 
  institution_id = COALESCE(NULLIF(institution_id, ''), "institutionId"),
  "institutionId" = COALESCE(NULLIF("institutionId", ''), institution_id),
  teacher_id = COALESCE(NULLIF(teacher_id, ''), "teacherId"),
  "teacherId" = COALESCE(NULLIF("teacherId", ''), teacher_id),
  subject_id = COALESCE(NULLIF(subject_id, ''), "subjectId"),
  "subjectId" = COALESCE(NULLIF("subjectId", ''), subject_id),
  course_id = COALESCE(NULLIF(course_id, ''), "courseId"),
  "courseId" = COALESCE(NULLIF("courseId", ''), course_id),
  start_time = COALESCE(NULLIF(start_time, ''), "startTime"),
  "startTime" = COALESCE(NULLIF("startTime", ''), start_time),
  end_time = COALESCE(NULLIF(end_time, ''), "endTime"),
  "endTime" = COALESCE(NULLIF("endTime", ''), end_time),
  date = COALESCE(NULLIF(date, ''), substring(COALESCE(start_time, "startTime") from 1 for 10), substring(created_at::text from 1 for 10)),
  "date" = COALESCE(NULLIF("date", ''), substring(COALESCE(start_time, "startTime") from 1 for 10), substring(created_at::text from 1 for 10));

UPDATE public.school_remedial_sessions
SET duration_hours = COALESCE(
    duration_hours,
    NULLIF(regexp_replace(COALESCE("durationHours"::text, ''), '[^0-9.]', '', 'g'), '')::numeric,
    NULLIF(regexp_replace(COALESCE(hours::text, ''), '[^0-9.]', '', 'g'), '')::numeric,
    1
)
WHERE duration_hours IS NULL OR duration_hours = 0;

UPDATE public.school_remedial_sessions
SET hours = COALESCE(
    NULLIF(hours::text, ''),
    duration_hours::text,
    NULLIF("durationHours"::text, ''),
    '1'
)
WHERE hours IS NULL OR hours::text = '' OR hours::text = '0';

UPDATE public.school_remedial_sessions
SET "durationHours" = COALESCE(
    NULLIF("durationHours"::text, ''),
    duration_hours::text,
    NULLIF(hours::text, ''),
    '1'
)
WHERE "durationHours" IS NULL OR "durationHours"::text = '' OR "durationHours"::text = '0';


-- 2. school_remedial_allocations
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "className" TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS teacher_name TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS day_of_week TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "dayOfWeek" TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "endTime" TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS stream TEXT;
ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "stream" TEXT;

UPDATE public.school_remedial_allocations
SET 
  institution_id = COALESCE(NULLIF(institution_id, ''), "institutionId"),
  "institutionId" = COALESCE(NULLIF("institutionId", ''), institution_id),
  course_id = COALESCE(NULLIF(course_id, ''), "courseId"),
  "courseId" = COALESCE(NULLIF("courseId", ''), course_id),
  class_name = COALESCE(NULLIF(class_name, ''), "className"),
  "className" = COALESCE(NULLIF("className", ''), class_name),
  subject_id = COALESCE(NULLIF(subject_id, ''), "subjectId"),
  "subjectId" = COALESCE(NULLIF("subjectId", ''), subject_id),
  subject_name = COALESCE(NULLIF(subject_name, ''), "subjectName"),
  "subjectName" = COALESCE(NULLIF("subjectName", ''), subject_name),
  teacher_id = COALESCE(NULLIF(teacher_id, ''), "teacherId"),
  "teacherId" = COALESCE(NULLIF("teacherId", ''), teacher_id),
  teacher_name = COALESCE(NULLIF(teacher_name, ''), "teacherName"),
  "teacherName" = COALESCE(NULLIF("teacherName", ''), teacher_name),
  day_of_week = COALESCE(NULLIF(day_of_week, ''), "dayOfWeek"),
  "dayOfWeek" = COALESCE(NULLIF("dayOfWeek", ''), day_of_week),
  start_time = COALESCE(NULLIF(start_time, ''), "startTime"),
  "startTime" = COALESCE(NULLIF("startTime", ''), start_time),
  end_time = COALESCE(NULLIF(end_time, ''), "endTime"),
  "endTime" = COALESCE(NULLIF("endTime", ''), end_time),
  stream = COALESCE(NULLIF(stream, ''), "stream"),
  "stream" = COALESCE(NULLIF("stream", ''), stream);


-- 3. school_remedial_rate_settings
ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 1000;
ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS "hourlyRate" NUMERIC DEFAULT 1000;
ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS weekday_hourly_rate NUMERIC DEFAULT 1000;
ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS "weekdayHourlyRate" NUMERIC DEFAULT 1000;
ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS weekend_hourly_rate NUMERIC DEFAULT 1500;
ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS "weekendHourlyRate" NUMERIC DEFAULT 1500;

UPDATE public.school_remedial_rate_settings
SET 
  institution_id = COALESCE(NULLIF(institution_id, ''), "institutionId"),
  "institutionId" = COALESCE(NULLIF("institutionId", ''), institution_id),
  hourly_rate = COALESCE(hourly_rate, "hourlyRate", 1000),
  "hourlyRate" = COALESCE("hourlyRate", hourly_rate, 1000);


-- 4. school_remedial_payouts
ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0;
ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS "totalHours" NUMERIC DEFAULT 0;
ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS "totalAmount" NUMERIC DEFAULT 0;

UPDATE public.school_remedial_payouts
SET 
  institution_id = COALESCE(NULLIF(institution_id, ''), "institutionId"),
  "institutionId" = COALESCE(NULLIF("institutionId", ''), institution_id),
  teacher_id = COALESCE(NULLIF(teacher_id, ''), "teacherId"),
  "teacherId" = COALESCE(NULLIF("teacherId", ''), teacher_id),
  total_hours = COALESCE(total_hours, "totalHours", 0),
  "totalHours" = COALESCE("totalHours", total_hours, 0),
  total_amount = COALESCE(total_amount, "totalAmount", 0),
  "totalAmount" = COALESCE("totalAmount", total_amount, 0);


-- 5. school_remedial_duty_roster
ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS duty_date TEXT;
ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS "dutyDate" TEXT;
ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS hours NUMERIC DEFAULT 4;

UPDATE public.school_remedial_duty_roster
SET 
  institution_id = COALESCE(NULLIF(institution_id, ''), "institutionId"),
  "institutionId" = COALESCE(NULLIF("institutionId", ''), institution_id),
  teacher_id = COALESCE(NULLIF(teacher_id, ''), "teacherId"),
  "teacherId" = COALESCE(NULLIF("teacherId", ''), teacher_id),
  duty_date = COALESCE(NULLIF(duty_date, ''), "dutyDate"),
  "dutyDate" = COALESCE(NULLIF("dutyDate", ''), duty_date);


-- 6. school_remedial_subjects
ALTER TABLE public.school_remedial_subjects ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.school_remedial_subjects ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.school_remedial_subjects ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE public.school_remedial_subjects ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
ALTER TABLE public.school_remedial_subjects ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE public.school_remedial_subjects ADD COLUMN IF NOT EXISTS "subjectName" TEXT;

UPDATE public.school_remedial_subjects
SET 
  institution_id = COALESCE(NULLIF(institution_id, ''), "institutionId"),
  "institutionId" = COALESCE(NULLIF("institutionId", ''), institution_id),
  subject_id = COALESCE(NULLIF(subject_id, ''), "subjectId"),
  "subjectId" = COALESCE(NULLIF("subjectId", ''), subject_id),
  subject_name = COALESCE(NULLIF(subject_name, ''), "subjectName"),
  "subjectName" = COALESCE(NULLIF("subjectName", ''), subject_name);
