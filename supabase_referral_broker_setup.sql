-- ============================================================================
-- Referral & Broker Management Schema Migration
-- College Admission & Fee Management System
-- ============================================================================

-- 1. Create the `brokers` table for managing partners and their current standard rates
CREATE TABLE IF NOT EXISTS public.brokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  current_agreed_amount NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (and allow full access with anon key for internal dashboard)
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'brokers' AND policyname = 'Enable all access for brokers'
  ) THEN
    CREATE POLICY "Enable all access for brokers" ON public.brokers
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 2. Add additive, backward-compatible columns to `students` table
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS admission_source TEXT NOT NULL DEFAULT 'Direct',
  ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS broker_agreed_amount NUMERIC DEFAULT NULL;

-- 3. Clean up any previous demo brokers if they were added
DELETE FROM public.brokers WHERE name IN ('Broker A', 'Broker B', 'Broker C');
