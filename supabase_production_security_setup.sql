-- ============================================================================
-- Complete Production Security & RLS Hardening Setup (Safe Execution)
-- College Admission & Fee Management System
-- ============================================================================

-- 1. Enable Row Level Security (RLS) on existing tables
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fee_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admission_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.program_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.academic_classes ENABLE ROW LEVEL SECURITY;

-- 2. Drop any overly permissive legacy policies
DROP POLICY IF EXISTS "Enable all access for brokers" ON public.brokers;
DROP POLICY IF EXISTS "Enable all access for students" ON public.students;
DROP POLICY IF EXISTS "Enable all access for payments" ON public.payments;
DROP POLICY IF EXISTS "Enable all access for fee_commitments" ON public.fee_commitments;

-- 3. Create Strict Policies: Authenticated Staff Only
DO $$ 
BEGIN
  -- Students Table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'Staff full access students') THEN
    CREATE POLICY "Staff full access students" ON public.students
      FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- Payments Table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Staff full access payments') THEN
    CREATE POLICY "Staff full access payments" ON public.payments
      FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- Fee Commitments Table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fee_commitments' AND policyname = 'Staff full access commitments') THEN
    CREATE POLICY "Staff full access commitments" ON public.fee_commitments
      FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- Brokers Table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brokers' AND policyname = 'Staff full access brokers') THEN
    CREATE POLICY "Staff full access brokers" ON public.brokers
      FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 4. Server-Side Secure Function for Broker Portal Access
CREATE OR REPLACE FUNCTION public.get_broker_portal_records(p_token TEXT, p_pin TEXT)
RETURNS JSON AS $$
DECLARE
  v_broker public.brokers%ROWTYPE;
  v_result JSON;
BEGIN
  -- Validate token, active status, and PIN inside the database
  SELECT * INTO v_broker 
  FROM public.brokers
  WHERE access_token = p_token 
    AND is_portal_active = true 
    AND is_active = true
    AND security_pin = p_pin;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid access token, incorrect PIN, or portal has been deactivated by administration.';
  END IF;

  -- Build secure sanitized payload with referred students
  SELECT json_build_object(
    'isLinkActive', true,
    'broker', json_build_object(
      'id', v_broker.id,
      'name', v_broker.name,
      'phone', v_broker.phone,
      'current_agreed_amount', v_broker.current_agreed_amount
    ),
    'students', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', s.id,
          'student_name', s.student_name,
          'father_name', s.father_name,
          'admission_session', s.admission_session,
          'admission_type', s.admission_type,
          'program_group', s.program_group,
          'academic_class', s.academic_class,
          'total_fee', s.total_fee,
          'broker_agreed_amount', s.broker_agreed_amount,
          'created_at', s.created_at,
          'enrollment_verification', s.enrollment_verification,
          'enrollment_card_issued', s.enrollment_card_issued,
          'examination_verification', s.examination_verification,
          'admit_card_issued', s.admit_card_issued,
          'payments', (
            SELECT COALESCE(json_agg(json_build_object('amount', p.amount, 'payment_date', p.payment_date)), '[]'::json)
            FROM public.payments p WHERE p.student_id = s.id
          )
        ) ORDER BY s.created_at DESC
      )
      FROM public.students s
      WHERE s.broker_id = v_broker.id
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_broker_portal_records(TEXT, TEXT) TO anon, authenticated;
