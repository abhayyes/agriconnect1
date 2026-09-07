-- AgriConnect Backend — DB Schema
-- Owner: Amrit (jointly designed with Anchal)
-- Field names match the merged schema from origin/backend
-- NOTE: This migration is idempotent — safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('farmer', 'fpo', 'consumer', 'bulk_buyer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL,
  phone         VARCHAR(20),
  location      VARCHAR(255),
  delivery_address VARCHAR(500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- Profile delivery address (idempotent for existing tables)
ALTER TABLE users ADD COLUMN IF NOT EXISTS delivery_address VARCHAR(500);

-- LISTINGS
DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('active', 'sold_out', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crop            VARCHAR(100) NOT NULL,
  variety         VARCHAR(100),
  quantity        NUMERIC(12,2) NOT NULL CHECK (quantity >= 0),
  unit            VARCHAR(20) NOT NULL,
  price_per_unit  NUMERIC(12,2) NOT NULL CHECK (price_per_unit >= 0),
  status          listing_status NOT NULL DEFAULT 'active',
  location        VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_crop      ON listings(crop);
CREATE INDEX IF NOT EXISTS idx_listings_farmer_id ON listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_status    ON listings(status);

-- PRICE HISTORY
CREATE TABLE IF NOT EXISTS price_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop        VARCHAR(100) NOT NULL,
  listing_id  UUID REFERENCES listings(id) ON DELETE SET NULL,
  price       NUMERIC(12,2) NOT NULL,
  unit        VARCHAR(20) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_crop_time ON price_history(crop, recorded_at);

-- ORDERS
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  quantity      NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  total_price   NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
  status        order_status NOT NULL DEFAULT 'pending',
  route         JSONB,
  delivery_address VARCHAR(500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id   ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_listing_id ON orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);

-- Payment fields (idempotent for existing tables)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) NOT NULL DEFAULT 'cod';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address VARCHAR(500);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at    ON users;
DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
DROP TRIGGER IF EXISTS trg_orders_updated_at   ON orders;

CREATE TRIGGER trg_users_updated_at    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated_at   BEFORE UPDATE ON orders   FOR EACH ROW EXECUTE FUNCTION set_updated_at();