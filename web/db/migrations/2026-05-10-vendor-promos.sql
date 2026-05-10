-- Vendor promos, customer claims, and QR redemption support.

BEGIN;

CREATE TABLE IF NOT EXISTS vendor_promos (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  discount_label TEXT,
  summary TEXT,
  details TEXT NOT NULL,
  terms TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_claims INT,
  claimed_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vendor_promos_max_claims_check
    CHECK (max_claims IS NULL OR max_claims > 0),
  CONSTRAINT vendor_promos_claimed_count_check
    CHECK (claimed_count >= 0),
  CONSTRAINT vendor_promos_time_window_check
    CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_vendor_promos_vendor_id
  ON vendor_promos (vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_promos_active_window
  ON vendor_promos (vendor_id, is_active, starts_at, ends_at, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_promo_claims (
  id UUID PRIMARY KEY,
  promo_id UUID NOT NULL REFERENCES vendor_promos(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'claimed',
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT customer_promo_claims_status_check
    CHECK (status IN ('claimed', 'redeemed', 'expired', 'canceled')),
  CONSTRAINT customer_promo_claims_once_per_customer
    UNIQUE (promo_id, customer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_promo_claims_vendor_status
  ON customer_promo_claims (vendor_id, status, claimed_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_promo_claims_customer
  ON customer_promo_claims (customer_user_id, claimed_at DESC);

COMMIT;
