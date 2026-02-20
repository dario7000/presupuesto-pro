-- =============================================
-- PresupuestoPRO — Base de datos
-- Copiá TODO esto en Supabase → SQL Editor → Run
-- =============================================

-- 1. Perfiles de usuario (extensión de auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT '',
  owner_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  trade TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  plan TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  quotes_this_month INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clientes del usuario
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Items guardados (precios de referencia)
CREATE TABLE saved_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'material',
  default_price NUMERIC(12,2) DEFAULT 0,
  unit TEXT DEFAULT 'unidad',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Presupuestos
CREATE TABLE quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  quote_number INT DEFAULT 1,
  title TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  subtotal NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
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
CREATE TABLE quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'material',
  quantity NUMERIC(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'unidad',
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0
);

-- 6. Pagos registrados
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT DEFAULT 'efectivo',
  notes TEXT DEFAULT '',
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Trigger: cuando se crea un usuario en auth, crear perfil
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- FUNCIÓN: Auto-incrementar número de presupuesto por usuario
-- =============================================

CREATE OR REPLACE FUNCTION public.set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.quote_number := COALESCE(
    (SELECT MAX(quote_number) FROM quotes WHERE user_id = NEW.user_id),
    0
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_quote_number_trigger
  BEFORE INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_quote_number();
