-- =============================================
-- PresupuestoPRO — Migración v2
-- Nuevas features: IVA, número personalizado, indexes
-- =============================================

-- 1. Agregar columnas de IVA a quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS iva_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS iva_amount NUMERIC(12,2) DEFAULT 0;

-- 2. Agregar next_quote_number a profiles (para número personalizable)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS next_quote_number INT DEFAULT 1;
-- Alias alternativo que usa el perfil
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quote_number_offset INT DEFAULT 0;

-- 3. Actualizar trigger de quote_number para respetar el offset del usuario
CREATE OR REPLACE FUNCTION public.set_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  user_offset INT;
  current_max INT;
BEGIN
  -- Obtener el offset del usuario
  SELECT COALESCE(quote_number_offset, 0) INTO user_offset
  FROM profiles WHERE id = NEW.user_id;

  -- Obtener el máximo actual
  SELECT COALESCE(MAX(quote_number), 0) INTO current_max
  FROM quotes WHERE user_id = NEW.user_id;

  -- Si el usuario ya proporcionó un número, usarlo
  IF NEW.quote_number IS NOT NULL AND NEW.quote_number > 0 THEN
    RETURN NEW;
  END IF;

  -- Usar el mayor entre el offset y el máximo existente + 1
  NEW.quote_number := GREATEST(user_offset, current_max) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. ✨ Indexes para performance
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_status ON quotes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_user_created ON quotes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_quote_id ON payments(quote_id);

-- 5. Reset mensual de quotes_this_month (requiere pg_cron extension)
-- Descomentar si tenés pg_cron habilitado en Supabase:
-- SELECT cron.schedule(
--   'reset-monthly-quotes',
--   '0 0 1 * *',
--   $$UPDATE profiles SET quotes_this_month = 0$$
-- );

-- 6. Vista de stats de clientes (para evitar N+1 queries)
CREATE OR REPLACE VIEW client_stats AS
SELECT
  c.*,
  COUNT(q.id) as quote_count,
  COALESCE(SUM(q.total), 0) as total_amount
FROM clients c
LEFT JOIN quotes q ON q.client_id = c.id
GROUP BY c.id;
