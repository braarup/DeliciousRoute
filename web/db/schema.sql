-- Delicious Route core schema for Vercel Postgres
-- Run this against your Vercel Postgres database.

-- USERS & ROLES

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended, deleted
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id SMALLSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL -- consumer, vendor_admin, staff, super_admin
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id SMALLINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- VENDORS & LOCATIONS

CREATE TABLE vendors (
  id UUID PRIMARY KEY,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  vendor_type TEXT NOT NULL, -- food_truck, pop_up, caterer, restaurant, etc.
  phone TEXT,
  website_url TEXT,
  instagram_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, paused
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vendor_locations (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  label TEXT,
  address_text TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE location_hours (
  id UUID PRIMARY KEY,
  vendor_location_id UUID NOT NULL REFERENCES vendor_locations(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL, -- 0=Sun … 6=Sat
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT FALSE
  -- Optional later: effective_start_date, effective_end_date
);

-- TAGS & MEDIA

CREATE TABLE tags (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, -- tacos, halal, vegan, dessert, etc.
  tag_type TEXT NOT NULL -- cuisine, dietary, service, vibe
);

CREATE TABLE vendor_tags (
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (vendor_id, tag_id)
);

CREATE TABLE vendor_media (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL, -- logo, photo, banner
  url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MENUS

CREATE TABLE menus (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Main Menu", "Late Night", etc.
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INT,
  is_available BOOLEAN DEFAULT TRUE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  is_spicy BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_vegetarian BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE item_media (
  id UUID PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- GRUB REELS (SHORT-FORM VIDEO)

CREATE TABLE reels (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption TEXT,
  status TEXT DEFAULT 'published', -- draft, published, removed
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reel_media (
  id UUID PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INT,
  width INT,
  height INT
);

CREATE TABLE reel_likes (
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (reel_id, user_id)
);

CREATE TABLE reel_comments (
  id UUID PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- DISCOVERY + TRUST (FAVORITES, REVIEWS)

CREATE TABLE favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, vendor_id)
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL, -- 1–5
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- LOYALTY

CREATE TABLE loyalty_accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  points_balance INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT loyalty_accounts_user_vendor_unique UNIQUE (user_id, vendor_id)
);

CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY,
  loyalty_account_id UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  txn_type TEXT NOT NULL, -- earn, redeem, adjust
  points INT NOT NULL,
  amount_cents INT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ADS

CREATE TABLE ad_accounts (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  monthly_budget_cents INT DEFAULT 0
);

CREATE TABLE ads (
  id UUID PRIMARY KEY,
  ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  title TEXT,
  creative_type TEXT, -- image, video, carousel
  destination_url TEXT,
  status TEXT DEFAULT 'active',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ
);

CREATE TABLE ad_impressions (
  id UUID PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  impression_at TIMESTAMPTZ DEFAULT now(),
  placement TEXT -- feed, map, vendor_page
);

CREATE TABLE ad_clicks (
  id UUID PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ DEFAULT now()
);

-- AUDIT EVENTS

CREATE TABLE IF NOT EXISTS vendor_audit_events (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_audit_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill dietary flags on existing menu_items tables, if present
ALTER TABLE IF EXISTS menu_items
  ADD COLUMN IF NOT EXISTS is_gluten_free BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_spicy BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_vegan BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN DEFAULT FALSE;

-- INDEXES & CONSTRAINTS

-- Geo lookup for vendors on map / nearby search
CREATE INDEX idx_vendor_locations_lat_lng ON vendor_locations (lat, lng);

-- Feed ordering for reels
CREATE INDEX idx_reels_created_at ON reels (created_at);

-- Vendor status/name filters & search
CREATE INDEX idx_vendors_status ON vendors (status);
CREATE INDEX idx_vendors_name ON vendors (name);

-- Additional profile fields for vendor edit page
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS cuisine_style TEXT,
  ADD COLUMN IF NOT EXISTS primary_region TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS hours_text TEXT,
  ADD COLUMN IF NOT EXISTS profile_image_path TEXT,
  ADD COLUMN IF NOT EXISTS header_image_path TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS x_url TEXT;

-- CUSTOMER PROFILES

CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  home_city TEXT,
  favorite_cuisines TEXT,
  dietary_preferences TEXT,
  notification_preferences TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Additional user profile fields for first-time signup
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Login sessions for persistent sign-in
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);
