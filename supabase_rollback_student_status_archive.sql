-- ============================================================================
-- Rollback Migration: Student Status & Archival
-- Target: public.students
-- ============================================================================

-- 1. Drop trigger if created
DROP TRIGGER IF EXISTS trg_check_student_active_before_payment ON public.payments;
DROP FUNCTION IF EXISTS public.check_student_active_before_payment();

-- 2. Drop index
DROP INDEX IF EXISTS public.idx_students_status;

-- 3. Drop columns from public.students
ALTER TABLE public.students
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS left_date,
  DROP COLUMN IF EXISTS left_reason,
  DROP COLUMN IF EXISTS status_changed_at,
  DROP COLUMN IF EXISTS status_changed_by;
