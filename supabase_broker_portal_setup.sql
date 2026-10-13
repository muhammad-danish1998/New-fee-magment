-- ============================================================================
-- Broker Secure Portal Link & PIN Migration
-- College Admission & Fee Management System
-- ============================================================================

-- 1. Add portal authentication and status columns to `public.brokers` table
ALTER TABLE public.brokers 
  ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS security_pin TEXT NOT NULL DEFAULT '1234',
  ADD COLUMN IF NOT EXISTS is_portal_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Populate access tokens for any existing rows
UPDATE public.brokers 
SET access_token = encode(gen_random_bytes(16), 'hex')
WHERE access_token IS NULL;

-- 3. Set default generator for future broker inserts
ALTER TABLE public.brokers 
  ALTER COLUMN access_token SET DEFAULT encode(gen_random_bytes(16), 'hex');
