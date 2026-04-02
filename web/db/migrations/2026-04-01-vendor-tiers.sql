-- Vendor tier migration (Starter/Growth) for Delicious Route
-- Safe to run once in production; includes idempotent guards where possible.

BEGIN;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS subscription_tier text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_renewal_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS food_type text,
  ADD COLUMN IF NOT EXISTS service_style text;

UPDATE vendors
SET
  subscription_tier = COALESCE(NULLIF(subscription_tier, ''), 'starter'),
  subscription_status = COALESCE(NULLIF(subscription_status, ''), 'active'),
  subscription_started_at = COALESCE(subscription_started_at, created_at, now())
WHERE
  subscription_tier IS NULL
  OR subscription_tier = ''
  OR subscription_status IS NULL
  OR subscription_status = ''
  OR subscription_started_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vendors_subscription_tier_check'
      AND conrelid = 'vendors'::regclass
  ) THEN
    ALTER TABLE vendors
      ADD CONSTRAINT vendors_subscription_tier_check
      CHECK (subscription_tier IN ('starter', 'growth'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vendors_subscription_status_check'
      AND conrelid = 'vendors'::regclass
  ) THEN
    ALTER TABLE vendors
      ADD CONSTRAINT vendors_subscription_status_check
      CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled'));
  END IF;
END $$;

ALTER TABLE vendors
  ALTER COLUMN subscription_tier SET NOT NULL,
  ALTER COLUMN subscription_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_subscription_tier
  ON vendors (subscription_tier);

CREATE INDEX IF NOT EXISTS idx_vendors_owner_user_id
  ON vendors (owner_user_id);

COMMIT;
