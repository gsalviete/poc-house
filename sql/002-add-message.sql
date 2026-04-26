-- Migration: adiciona campo message nas contribuições
-- Rodar no Supabase SQL Editor

ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS message VARCHAR(300);

-- Índice para busca de stats na home
CREATE INDEX IF NOT EXISTS idx_items_created_at        ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contributions_created_at ON contributions(created_at DESC);
