-- Backfill-safe promo claim counter and timestamps for existing databases.

BEGIN;

ALTER TABLE vendor_promos
  ADD COLUMN IF NOT EXISTS claimed_count INT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vendor_promos_claimed_count_check'
  ) THEN
    ALTER TABLE vendor_promos
      ADD CONSTRAINT vendor_promos_claimed_count_check
      CHECK (claimed_count >= 0);
  END IF;
END $$;

UPDATE vendor_promos vp
SET claimed_count = counts.claim_count,
    updated_at = now()
FROM (
  SELECT promo_id, COUNT(*)::int AS claim_count
  FROM customer_promo_claims
  GROUP BY promo_id
) AS counts
WHERE vp.id = counts.promo_id;

ALTER TABLE customer_promo_claims
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE customer_promo_claims
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMIT;
