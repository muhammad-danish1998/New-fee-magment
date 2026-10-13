-- ============================================================================
-- Migration: Student Status & Archival (Passed Out, Left, Transferred, Struck Off)
-- Target: public.students
-- ============================================================================
-- DO NOT RUN UNTIL USER APPROVAL
-- ============================================================================

-- 1. Add status and archival tracking columns to public.students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CONSTRAINT chk_students_status CHECK (status IN ('active', 'passed_out', 'left', 'transferred', 'struck_off')),
  ADD COLUMN IF NOT EXISTS left_date DATE NULL,
  ADD COLUMN IF NOT EXISTS left_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL;

-- 2. Confirm existing rows default to 'active'
UPDATE public.students
SET status = 'active'
WHERE status IS NULL;

-- 3. Create index for fast status filtering
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students (status);

-- ============================================================================
-- Optional DB Protection Trigger (Optional / Proposed)
-- Note: The application currently authenticates via the `admin_users` table
-- using the Supabase client-side anon key (not Supabase Auth JWTs).
-- Therefore, role-based protection (Staff vs Admin) is currently enforced at the
-- UI/Service layer. If a database-level hard block on payments for archived students
-- is desired regardless of user, this trigger can be enabled:
-- ============================================================================
/*
CREATE OR REPLACE FUNCTION public.check_student_active_before_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.students 
    WHERE id = NEW.student_id AND status != 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot record payment for an archived student (status: not active).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_student_active_before_payment ON public.payments;
CREATE TRIGGER trg_check_student_active_before_payment
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_student_active_before_payment();
*/
