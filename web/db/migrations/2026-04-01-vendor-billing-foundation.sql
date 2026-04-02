-- Vendor billing foundation tables for future Stripe integration.
-- This migration is safe to run after the vendor tier migration.

BEGIN;

CREATE TABLE IF NOT EXISTS vendor_subscriptions (
  id uuid PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  provider_customer_id text,
  provider_subscription_id text UNIQUE,
  tier text NOT NULL CHECK (tier IN ('starter', 'growth')),
  status text NOT NULL CHECK (status IN ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vendor_subscriptions_vendor_id_key'
      AND conrelid = 'vendor_subscriptions'::regclass
  ) THEN
    ALTER TABLE vendor_subscriptions
      ADD CONSTRAINT vendor_subscriptions_vendor_id_key UNIQUE (vendor_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS vendor_subscription_events (
  id uuid PRIMARY KEY,
  vendor_subscription_id uuid NOT NULL REFERENCES vendor_subscriptions(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  provider_event_id text,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_vendor_id
  ON vendor_subscriptions (vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_provider_subscription_id
  ON vendor_subscriptions (provider_subscription_id);

CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_status
  ON vendor_subscriptions (status);

CREATE INDEX IF NOT EXISTS idx_vendor_subscription_events_vendor_subscription_id
  ON vendor_subscription_events (vendor_subscription_id);

CREATE INDEX IF NOT EXISTS idx_vendor_subscription_events_vendor_id
  ON vendor_subscription_events (vendor_id);

COMMIT;
