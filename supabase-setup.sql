-- =============================================
-- PresupuestoPRO — Base de datos v2
-- =============================================

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
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  quotes_this_month INT DEFAULT 0 CHECK (quotes_this_month >= 0),
  quote_number_offset INT DEFAULT 0 CHECK (quote_number_offset >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE saved_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  category TEXT DEFAULT 'material' CHECK (category IN ('material', 'mano_de_obra', 'otro')),
  default_price NUMERIC(12,2) DEFAULT 0 CHECK (default_price >= 0),
  unit TEXT DEFAULT 'unidad',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  quote_number INT DEFAULT 1,
  title TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','in_progress','completed','paid')),
  subtotal NUMERIC(12,2) DEFAULT 0 CHECK (subtotal >= 0),
  discount_percent NUMERIC(5,2) DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  discount_amount NUMERIC(12,2) DEFAULT 0 CHECK (discount_amount >= 0),
  tax_percent NUMERIC(5,2) DEFAULT 0 CHECK (tax_percent >= 0),
  tax_amount NUMERIC(12,2) DEFAULT 0 CHECK (tax_amount >= 0),
  total NUMERIC(12,2) DEFAULT 0 CHECK (total >= 0),
  notes TEXT DEFAULT '',
  valid_until DATE,
  vehicle_info TEXT DEFAULT '',
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'material' CHECK (category IN ('material', 'mano_de_obra', 'otro')),
  quantity NUMERIC(10,2) DEFAULT 1 CHECK (quantity > 0),
  unit TEXT DEFAULT 'unidad',
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  sort_order INT DEFAULT 0
);

CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method TEXT DEFAULT 'efectivo',
  notes TEXT DEFAULT '',
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_user_status ON quotes(user_id, status);
CREATE INDEX idx_quotes_user_created ON quotes(user_id, created_at DESC);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_payments_quote_id ON payments(quote_id);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users manage own clients" ON clients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own saved items" ON saved_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own quotes" ON quotes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own quote items" ON quote_items FOR ALL
  USING (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()));
CREATE POLICY "Users manage own payments" ON payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-crear perfil
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, owner_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Número de presupuesto con offset personalizable
CREATE OR REPLACE FUNCTION public.set_quote_number() RETURNS TRIGGER AS $$
DECLARE current_max INT; user_offset INT;
BEGIN
  SELECT COALESCE(quote_number_offset, 0) INTO user_offset FROM profiles WHERE id = NEW.user_id;
  SELECT COALESCE(MAX(quote_number), 0) INTO current_max FROM quotes WHERE user_id = NEW.user_id;
  IF current_max = 0 THEN NEW.quote_number := user_offset + 1;
  ELSE NEW.quote_number := GREATEST(current_max, user_offset) + 1; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_quote_number_trigger BEFORE INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_quote_number();

-- Crear presupuesto con validación server-side
CREATE OR REPLACE FUNCTION public.create_quote_checked(
  p_user_id UUID, p_client_id UUID, p_title TEXT, p_status TEXT,
  p_subtotal NUMERIC, p_discount_percent NUMERIC, p_discount_amount NUMERIC,
  p_tax_percent NUMERIC DEFAULT 0, p_tax_amount NUMERIC DEFAULT 0,
  p_total NUMERIC, p_notes TEXT DEFAULT '', p_vehicle_info TEXT DEFAULT '',
  p_sent_at TIMESTAMPTZ DEFAULT NULL
) RETURNS quotes AS $$
DECLARE user_plan TEXT; user_count INT; new_quote quotes%ROWTYPE;
BEGIN
  SELECT plan, quotes_this_month INTO user_plan, user_count FROM profiles WHERE id = p_user_id;
  IF user_plan = 'free' AND user_count >= 5 AND p_status != 'draft' THEN
    RAISE EXCEPTION 'Límite de presupuestos del plan gratis alcanzado (5/mes)';
  END IF;
  INSERT INTO quotes (user_id, client_id, title, status, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, notes, vehicle_info, sent_at)
  VALUES (p_user_id, p_client_id, p_title, p_status, p_subtotal, p_discount_percent, p_discount_amount, p_tax_percent, p_tax_amount, p_total, p_notes, p_vehicle_info, p_sent_at)
  RETURNING * INTO new_quote;
  IF p_status != 'draft' THEN UPDATE profiles SET quotes_this_month = quotes_this_month + 1 WHERE id = p_user_id; END IF;
  RETURN new_quote;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset mensual (usar con pg_cron)
CREATE OR REPLACE FUNCTION public.reset_monthly_quotes() RETURNS void AS $$
BEGIN UPDATE profiles SET quotes_this_month = 0; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
