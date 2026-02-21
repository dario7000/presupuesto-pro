-- PresupuestoPRO — Migración v3: Multi-moneda + Multi-idioma
-- Correr en Supabase → SQL Editor → Run

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ARS';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es';
