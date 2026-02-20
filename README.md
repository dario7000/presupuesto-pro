# PresupuestoPRO

Presupuestos profesionales para oficios. Creá, enviá por WhatsApp y cobrá.

## Setup rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Supabase
- Creá una cuenta en https://supabase.com (gratis)
- Creá un proyecto nuevo
- Andá a **SQL Editor** y pegá todo el contenido de `supabase-setup.sql` → Run
- Andá a **Settings → API** y copiá:
  - Project URL
  - anon public key

### 3. Configurar variables de entorno
Renombrá `.env.example` a `.env.local` y completá con tus datos:
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...tu-clave-aca
```

### 4. Correr en modo desarrollo
```bash
npm run dev
```
Abrí http://localhost:3000

### 5. Deploy en Vercel
```bash
git init
git add .
git commit -m "PresupuestoPRO MVP"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/presupuesto-pro.git
git push -u origin main
```
Luego en https://vercel.com → Import → Agregar las 2 variables de entorno → Deploy
