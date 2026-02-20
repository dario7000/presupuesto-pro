-- =============================================
-- MIGRACIÓN: Logo + Storage
-- Corré esto en Supabase → SQL Editor → Run
-- =============================================

-- 1. Agregar columna logo_url a profiles (si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN logo_url text DEFAULT '';
  END IF;
END $$;

-- 2. Crear bucket de storage para logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Política: usuarios pueden subir su propio logo
CREATE POLICY IF NOT EXISTS "Users can upload their own logo"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos' 
    AND (storage.foldername(name))[1] = 'logos'
  );

-- 4. Política: usuarios pueden actualizar su logo
CREATE POLICY IF NOT EXISTS "Users can update their own logo"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = 'logos'
  );

-- 5. Política: cualquiera puede ver los logos (son públicos para los PDFs)
CREATE POLICY IF NOT EXISTS "Logos are publicly accessible"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'logos');
