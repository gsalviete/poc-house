-- poc-house initial schema
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Contribution status enum
CREATE TYPE contribution_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- Items table
CREATE TABLE items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  price_cents   INTEGER NOT NULL CHECK (price_cents > 0),
  image_url     VARCHAR(500),
  external_link VARCHAR(500),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contributions table
CREATE TABLE contributions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id           UUID REFERENCES items(id) ON DELETE SET NULL,
  contributor_name  VARCHAR(100) NOT NULL,
  amount_cents      INTEGER NOT NULL CHECK (amount_cents > 0),
  receipt_url       VARCHAR(500),
  status            contribution_status NOT NULL DEFAULT 'pending',
  pix_tx_id         VARCHAR(100),
  admin_notes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin table (single row)
CREATE TABLE admin (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contributions_item_id ON contributions(item_id);
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_items_is_active ON items(is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contributions_updated_at
  BEFORE UPDATE ON contributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
