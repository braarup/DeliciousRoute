-- Add admin-controlled is_verified flag to vendors
-- Run AFTER 2026-04-01-vendor-tiers.sql

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- Partial index: only index verified vendors (keeps index tiny)
CREATE INDEX IF NOT EXISTS idx_vendors_is_verified
  ON vendors (id)
  WHERE is_verified = true;
