-- ============================================================================
-- Complete Database Migration Script for College Admission & Fee Management System
-- Target Database: https://[your-project-ref].supabase.co
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/[your-project-ref]
-- 2. Go to the SQL Editor (Left sidebar -> SQL Editor).
-- 3. Click "New Query", paste this entire script, and click "Run".
-- ============================================================================

-- Enable pgcrypto for UUID & token generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Configuration Tables (Admission Types, Program Groups, Academic Classes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admission_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_type_code TEXT REFERENCES public.admission_types(code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academic_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_type_code TEXT REFERENCES public.admission_types(code) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. Admin Users Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'Administrator',
  full_name TEXT DEFAULT 'Principal / Administrator',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. Referral / Broker Management Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.brokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  current_agreed_amount NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  access_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  security_pin TEXT NOT NULL DEFAULT '1234',
  is_portal_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. Students Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  date_of_birth DATE,
  student_cnic TEXT,
  father_cnic TEXT,
  gender TEXT,
  contact_number TEXT,
  reference TEXT,
  admission_session TEXT NOT NULL,
  admission_type TEXT NOT NULL,
  program_group TEXT NOT NULL,
  academic_class TEXT NOT NULL,
  total_fee NUMERIC NOT NULL DEFAULT 0,
  next_payment_due_date DATE,
  enrollment_verification BOOLEAN DEFAULT false,
  enrollment_verification_date DATE,
  enrollment_card_issued BOOLEAN DEFAULT false,
  enrollment_card_issued_date DATE,
  examination_verification BOOLEAN DEFAULT false,
  examination_verification_date DATE,
  admit_card_issued BOOLEAN DEFAULT false,
  admit_card_issued_date DATE,
  promised_amount NUMERIC,
  commitment_status TEXT DEFAULT 'None',
  commitment_notes TEXT,
  admission_source TEXT NOT NULL DEFAULT 'Direct',
  broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
  broker_agreed_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. Payments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  receipt_no TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 6. Fee Commitments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fee_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  promised_amount NUMERIC NOT NULL,
  promised_date DATE NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  reason_or_notes TEXT,
  extended_to_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 7. Leads Table (Optional / Public Inquiries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  service_type TEXT NOT NULL,
  urgency TEXT NOT NULL,
  street_address TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. Seed Default Config Data (Admission Types, Groups, Classes, Admin)
-- ============================================================================

-- Admission Types
INSERT INTO public.admission_types (code, name, display_order, is_active)
VALUES
  ('REGULAR', 'Regular', 1, true),
  ('PRIVATE', 'Private', 2, true),
  ('COMBINE', 'Combine (Gap)', 3, true)
ON CONFLICT (code) DO NOTHING;

-- Program Groups
INSERT INTO public.program_groups (admission_type_code, name, display_order, is_active)
VALUES
  -- Combine (Gap)
  ('COMBINE', 'Commerce Private', 1, true),
  ('COMBINE', 'Computer Science Private', 2, true),
  ('COMBINE', 'General Private', 3, true),
  ('COMBINE', 'General Science Private', 4, true),
  ('COMBINE', 'Humanities Private', 5, true),
  ('COMBINE', 'Pre Engineering Private', 6, true),
  ('COMBINE', 'Pre Medical Private', 7, true),
  ('COMBINE', 'Science Private', 8, true),
  -- Private
  ('PRIVATE', 'Private Computer Science', 1, true),
  ('PRIVATE', 'Private Science', 2, true),
  ('PRIVATE', 'Commerce Private', 3, true),
  ('PRIVATE', 'General Private', 4, true),
  ('PRIVATE', 'Humanities Private', 5, true),
  -- Regular
  ('REGULAR', 'Commerce Regular', 1, true),
  ('REGULAR', 'Computer Science', 2, true),
  ('REGULAR', 'General Regular', 3, true),
  ('REGULAR', 'General Science Regular', 4, true),
  ('REGULAR', 'Humanities Regular', 5, true),
  ('REGULAR', 'Pre Engineering Regular', 6, true),
  ('REGULAR', 'Pre Medical Regular', 7, true),
  ('REGULAR', 'Science Regular', 8, true)
ON CONFLICT DO NOTHING;

-- Academic Classes
INSERT INTO public.academic_classes (admission_type_code, class_name, display_order, is_active)
VALUES
  -- Combine (Gap)
  ('COMBINE', 'IX, X Combine', 1, true),
  ('COMBINE', 'XI, XII Combine', 2, true),
  -- Private
  ('PRIVATE', 'IX', 1, true),
  ('PRIVATE', 'X', 2, true),
  ('PRIVATE', 'XI', 3, true),
  ('PRIVATE', 'XII', 4, true),
  -- Regular
  ('REGULAR', 'IX', 1, true),
  ('REGULAR', 'X', 2, true),
  ('REGULAR', 'XI', 3, true),
  ('REGULAR', 'XII', 4, true)
ON CONFLICT DO NOTHING;

-- Default Admin User
INSERT INTO public.admin_users (username, email, password, role, full_name)
VALUES ('jmt1966', 'admin@jmtcollege.edu.pk', 'jmt1966', 'Administrator', 'JMT Admin')
ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- 9. Row Level Security (RLS) & Access Policies
-- ============================================================================

ALTER TABLE public.admission_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow application client access
DROP POLICY IF EXISTS "Allow access admission_types" ON public.admission_types;
CREATE POLICY "Allow access admission_types" ON public.admission_types FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow access program_groups" ON public.program_groups;
CREATE POLICY "Allow access program_groups" ON public.program_groups FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow access academic_classes" ON public.academic_classes;
CREATE POLICY "Allow access academic_classes" ON public.academic_classes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow access admin_users" ON public.admin_users;
CREATE POLICY "Allow access admin_users" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow access brokers" ON public.brokers;
CREATE POLICY "Allow access brokers" ON public.brokers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow access students" ON public.students;
CREATE POLICY "Allow access students" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow access payments" ON public.payments;
CREATE POLICY "Allow access payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow access fee_commitments" ON public.fee_commitments;
CREATE POLICY "Allow access fee_commitments" ON public.fee_commitments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow access leads" ON public.leads;
CREATE POLICY "Allow access leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 10. Broker Portal Stored Procedure
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_broker_portal_records(p_token TEXT, p_pin TEXT)
RETURNS JSON AS $$
DECLARE
  v_broker public.brokers%ROWTYPE;
  v_result JSON;
BEGIN
  SELECT * INTO v_broker 
  FROM public.brokers
  WHERE access_token = p_token 
    AND is_portal_active = true 
    AND is_active = true
    AND security_pin = p_pin;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid access token, incorrect PIN, or portal has been deactivated by administration.';
  END IF;

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

-- ============================================================================
-- 11. Sample Test Student & Payment (For Quick Testing)
-- ============================================================================

DO $$
DECLARE
  v_student_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.students LIMIT 1) THEN
    -- Insert a sample student
    INSERT INTO public.students (
      student_name,
      father_name,
      date_of_birth,
      student_cnic,
      father_cnic,
      gender,
      contact_number,
      reference,
      admission_session,
      admission_type,
      program_group,
      academic_class,
      total_fee,
      next_payment_due_date,
      enrollment_verification,
      enrollment_card_issued,
      admission_source
    ) VALUES (
      'Muhammad Ali (Test)',
      'Tariq Khan',
      '2006-03-15',
      '42101-1234567-1',
      '42101-7654321-1',
      'Male',
      '03001234567',
      'Direct Walk-in',
      'Annual I',
      'Regular',
      'Computer Science',
      'XI',
      35000,
      CURRENT_DATE + INTERVAL '15 days',
      true,
      false,
      'Direct'
    ) RETURNING id INTO v_student_id;

    -- Insert initial partial payment
    INSERT INTO public.payments (
      student_id,
      amount,
      payment_date,
      payment_method,
      receipt_no,
      notes
    ) VALUES (
      v_student_id,
      15000,
      CURRENT_DATE,
      'Cash',
      'RCP-TEST-001',
      'Initial admission test payment'
    );
  END IF;
END $$;
