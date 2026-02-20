-- ============================================
-- STORAGE: Crear bucket para logos
-- Correr esto en Supabase SQL Editor
-- ============================================

-- Crear bucket público para logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152, -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política: cualquiera puede VER logos (son públicos)
CREATE POLICY "Logos son públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Política: usuarios autenticados pueden SUBIR su propio logo
CREATE POLICY "Usuarios suben su logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] = 'logos'
);

-- Política: usuarios pueden ACTUALIZAR su propio logo
CREATE POLICY "Usuarios actualizan su logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos');

-- Política: usuarios pueden BORRAR su propio logo
CREATE POLICY "Usuarios borran su logo"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos');
