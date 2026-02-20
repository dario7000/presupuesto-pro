-- =============================================
-- PresupuestoPRO v2 — Base de datos mejorada
-- Copiá TODO esto en Supabase → SQL Editor → Run
-- =============================================

-- 1. Perfiles de usuario (extensión de auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT '',
  owner_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  trade TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  quotes_this_month INT DEFAULT 0 CHECK (quotes_this_month >= 0),
  next_quote_number INT DEFAULT 1 CHECK (next_quote_number >= 1),  -- ← NUEVO
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clientes del usuario
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) > 0),
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Items guardados (precios de referencia)
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) > 0),
  category TEXT DEFAULT 'material' CHECK (category IN ('material', 'mano_de_obra', 'otro')),
  default_price NUMERIC(12,2) DEFAULT 0 CHECK (default_price >= 0),
  unit TEXT DEFAULT 'unidad',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Presupuestos
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  quote_number INT DEFAULT 1,
  title TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'in_progress', 'completed', 'paid')),
  subtotal NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_amount NUMERIC(12,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0 CHECK (tax_percent >= 0 AND tax_percent <= 100),
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  valid_until DATE,
  vehicle_info TEXT DEFAULT '',
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Items de cada presupuesto
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'material',
  quantity NUMERIC(10,2) DEFAULT 1 CHECK (quantity > 0),
  unit TEXT DEFAULT 'unidad',
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0
);

-- 6. Pagos registrados
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method TEXT DEFAULT 'efectivo',
  notes TEXT DEFAULT '',
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES para mejor performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_status ON quotes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_user_created ON quotes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_quote_id ON payments(quote_id);

-- =============================================
-- ROW LEVEL SECURITY (cada usuario solo ve sus datos)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles: usuario ve y edita solo su perfil
CREATE POLICY "Users manage own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Clients: usuario ve solo sus clientes
CREATE POLICY "Users manage own clients"
  ON clients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Saved items: usuario ve solo sus items
CREATE POLICY "Users manage own saved items"
  ON saved_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Quotes: usuario ve solo sus presupuestos
CREATE POLICY "Users manage own quotes"
  ON quotes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Quote items: usuario ve items de sus presupuestos
CREATE POLICY "Users manage own quote items"
  ON quote_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

-- Payments: usuario ve solo sus pagos
CREATE POLICY "Users manage own payments"
  ON payments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FUNCIÓN: Crear perfil automáticamente al registrarse
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, owner_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- FUNCIÓN: Auto-incrementar número de presupuesto
-- Usa next_quote_number del perfil como base personalizable
-- =============================================
CREATE OR REPLACE FUNCTION public.set_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  current_max INT;
  profile_next INT;
BEGIN
  -- Obtener el máximo actual del usuario
  SELECT COALESCE(MAX(quote_number), 0) INTO current_max
  FROM quotes WHERE user_id = NEW.user_id;

  -- Obtener el next_quote_number del perfil
  SELECT COALESCE(next_quote_number, 1) INTO profile_next
  FROM profiles WHERE id = NEW.user_id;

  -- Usar el mayor entre el máximo actual +1 y el next del perfil
  NEW.quote_number := GREATEST(current_max + 1, profile_next);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_quote_number_trigger
  BEFORE INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_quote_number();

-- =============================================
-- FUNCIÓN: Incrementar quotes_this_month al crear presupuesto (NO draft)
-- Esto se maneja ahora del lado del server, no del frontend
-- =============================================
CREATE OR REPLACE FUNCTION public.increment_quote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != 'draft' THEN
    UPDATE profiles 
    SET quotes_this_month = quotes_this_month + 1
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER increment_quote_count_trigger
  AFTER INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.increment_quote_count();

-- =============================================
-- FUNCIÓN: Verificar límites del plan free ANTES de insertar
-- =============================================
CREATE OR REPLACE FUNCTION public.check_plan_limits()
RETURNS TRIGGER AS $$
DECLARE
  user_plan TEXT;
  user_quotes_count INT;
BEGIN
  SELECT plan, quotes_this_month INTO user_plan, user_quotes_count
  FROM profiles WHERE id = NEW.user_id;

  IF user_plan = 'free' AND NEW.status != 'draft' AND user_quotes_count >= 5 THEN
    RAISE EXCEPTION 'Plan free: límite de 5 presupuestos por mes alcanzado';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER check_plan_limits_trigger
  BEFORE INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.check_plan_limits();

-- =============================================
-- VISTA: Estadísticas de clientes (evita query N+1)
-- =============================================
CREATE OR REPLACE VIEW client_stats AS
SELECT
  c.*,
  COALESCE(COUNT(q.id), 0)::int AS quote_count,
  COALESCE(SUM(q.total), 0)::numeric AS total_amount
FROM clients c
LEFT JOIN quotes q ON q.client_id = c.id
GROUP BY c.id;

-- =============================================
-- MIGRACIÓN: Agregar columnas nuevas si ya tenés la tabla existente
-- (Ejecutar si ya tenés datos en producción)
-- =============================================
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS next_quote_number INT DEFAULT 1;
-- ALTER TABLE quotes ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2) DEFAULT 0;
-- ALTER TABLE quotes ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0;

-- =============================================
-- CRON: Resetear contador mensual (usar con pg_cron o Edge Function)
-- SELECT cron.schedule('reset-monthly-quotes', '0 0 1 * *',
--   $$UPDATE profiles SET quotes_this_month = 0$$
-- );
-- =============================================
