-- Add vendor permit fields used by DR internal verification workflow

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS sidewalk_vending_permit TEXT,
  ADD COLUMN IF NOT EXISTS sellers_permit TEXT,
  ADD COLUMN IF NOT EXISTS health_permit TEXT;
