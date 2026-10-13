-- ============================================================================
-- Restore Full Dashboard & Broker Access SQL Script
-- Run this in Supabase SQL Editor to immediately restore all brokers & tables
-- ============================================================================

-- 1. Drop the restrictive authenticated-only policies
DROP POLICY IF EXISTS "Staff full access students" ON public.students;
DROP POLICY IF EXISTS "Staff full access payments" ON public.payments;
DROP POLICY IF EXISTS "Staff full access commitments" ON public.fee_commitments;
DROP POLICY IF EXISTS "Staff full access brokers" ON public.brokers;
DROP POLICY IF EXISTS "Staff full access admission_types" ON public.admission_types;
DROP POLICY IF EXISTS "Staff full access program_groups" ON public.program_groups;
DROP POLICY IF EXISTS "Staff full access academic_classes" ON public.academic_classes;

DROP POLICY IF EXISTS "Allow access students" ON public.students;
DROP POLICY IF EXISTS "Allow access payments" ON public.payments;
DROP POLICY IF EXISTS "Allow access commitments" ON public.fee_commitments;
DROP POLICY IF EXISTS "Allow access brokers" ON public.brokers;

-- 2. Create policies that allow the frontend client full access to load all data
CREATE POLICY "Allow access students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow access payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow access commitments" ON public.fee_commitments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow access brokers" ON public.brokers FOR ALL USING (true) WITH CHECK (true);

-- 3. Ensure dynamic admission configuration tables are also accessible
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admission_types') THEN
    DROP POLICY IF EXISTS "Allow access admission_types" ON public.admission_types;
    CREATE POLICY "Allow access admission_types" ON public.admission_types FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'program_groups') THEN
    DROP POLICY IF EXISTS "Allow access program_groups" ON public.program_groups;
    CREATE POLICY "Allow access program_groups" ON public.program_groups FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academic_classes') THEN
    DROP POLICY IF EXISTS "Allow access academic_classes" ON public.academic_classes;
    CREATE POLICY "Allow access academic_classes" ON public.academic_classes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
