# PresupuestoPRO — Guía de Instalación Paso a Paso (Windows)

## ⏱️ Tiempo estimado: 45-60 minutos (una sola vez)

---

## PASO 1: Instalar Node.js (5 min)

1. Abrí tu navegador y andá a: **https://nodejs.org**
2. Descargá la versión **LTS** (el botón verde grande de la izquierda)
3. Ejecutá el instalador (.msi)
4. Dale **Next → Next → Next → Install** (no cambies nada)
5. Verificá que se instaló:
   - Abrí **PowerShell** (buscá "PowerShell" en el menú de Windows)
   - Escribí: `node --version`
   - Debería aparecer algo como: `v20.x.x` ✅
   - Escribí: `npm --version`
   - Debería aparecer algo como: `10.x.x` ✅

> Si ya tenés Node.js instalado, saltá este paso.

---

## PASO 2: Crear cuenta en Supabase (5 min)

Supabase es la base de datos gratuita donde se guardan los presupuestos, clientes, etc.

1. Andá a: **https://supabase.com**
2. Hacé clic en **"Start your project"**
3. Registrate con tu cuenta de **GitHub** (el botón "Continue with GitHub")
4. Creá un nuevo proyecto:
   - **Name:** `presupuesto-pro`
   - **Database Password:** Poné algo seguro y GUARDALO (lo vas a necesitar)
   - **Region:** Elegí `South America (São Paulo)` si está disponible, o el más cercano
   - Hacé clic en **"Create new project"**
5. Esperá ~2 minutos a que se cree
6. Una vez listo, andá a **Settings → API** (menú de la izquierda)
7. Copiá y guardá en un bloc de notas estos 2 valores:
   - **Project URL** → algo como `https://xyzabc.supabase.co`
   - **anon/public key** → una cadena larga que empieza con `eyJ...`

> 📝 GUARDALOS. Los vamos a usar en el Paso 5.

---

## PASO 3: Crear las tablas en Supabase (5 min)

1. En Supabase, andá a **SQL Editor** (menú de la izquierda, ícono de código)
2. Hacé clic en **"New query"**
3. Yo te voy a dar el SQL completo para copiar y pegar acá
4. Hacé clic en **"Run"** (el botón verde)
5. Debería decir "Success" ✅

> El SQL te lo doy en el siguiente mensaje.

---

## PASO 4: Crear el proyecto en tu computadora (10 min)

Abrí **PowerShell** y corré estos comandos UNO POR UNO:

```powershell
# 1. Ir al escritorio (o donde quieras el proyecto)
cd ~\Desktop

# 2. Crear el proyecto Next.js (va a tardar 1-2 minutos)
npx create-next-app@latest presupuesto-pro --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm

# 3. Entrar a la carpeta del proyecto
cd presupuesto-pro

# 4. Instalar las dependencias que necesitamos
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs jspdf jspdf-autotable

# 5. Verificar que todo está bien
npm run dev
```

Después del paso 5, abrí tu navegador en **http://localhost:3000**. Deberías ver la página de Next.js por defecto. Si la ves, ¡está todo bien! Cerrá el servidor con **Ctrl + C**.

---

## PASO 5: Configurar las claves de Supabase (2 min)

1. En la carpeta del proyecto (`presupuesto-pro`), creá un archivo llamado `.env.local`
2. Podés crearlo desde PowerShell:

```powershell
New-Item -Path .env.local -ItemType File
notepad .env.local
```

3. Se va a abrir el Bloc de Notas. Pegá esto (reemplazando con TUS valores del Paso 2):

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJTU-CLAVE-LARGA-ACA
```

4. Guardá y cerrá el Bloc de Notas.

---

## PASO 6: Copiar los archivos del proyecto (15 min)

Yo te voy a dar cada archivo con su ruta exacta. Vos solo:
1. Creás la carpeta si no existe
2. Creás el archivo
3. Pegás el contenido

Te voy a dar los archivos en orden. Son aproximadamente 10-12 archivos.

> Podés usar **VS Code** (descargalo de https://code.visualstudio.com si no lo tenés).
> Abrí VS Code → File → Open Folder → seleccioná la carpeta `presupuesto-pro`.
> Desde ahí podés crear carpetas y archivos fácilmente.

---

## PASO 7: Probar localmente (2 min)

```powershell
npm run dev
```

Abrí **http://localhost:3000** en tu navegador. Deberías ver PresupuestoPRO funcionando.

---

## PASO 8: Subir a GitHub (5 min)

```powershell
# Desde la carpeta presupuesto-pro
git init
git add .
git commit -m "PresupuestoPRO MVP"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/presupuesto-pro.git
git push -u origin main
```

> Antes de esto, creá un repositorio vacío en GitHub:
> 1. Andá a https://github.com/new
> 2. Name: `presupuesto-pro`
> 3. Dejá todo lo demás vacío (SIN readme, SIN .gitignore)
> 4. Hacé clic en "Create repository"

---

## PASO 9: Deploy en Vercel GRATIS (5 min)

1. Andá a: **https://vercel.com**
2. Registrate con **GitHub**
3. Hacé clic en **"Add New..." → "Project"**
4. Buscá `presupuesto-pro` en la lista de repos
5. Hacé clic en **"Import"**
6. En **"Environment Variables"**, agregá las 2 variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = tu URL de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu clave anon
7. Hacé clic en **"Deploy"**
8. Esperá 1-2 minutos
9. ¡LISTO! Te da una URL tipo `presupuesto-pro.vercel.app` 🎉

---

## PASO 10: Dominio custom (opcional, $10/año)

1. Comprá un dominio en **https://www.namecheap.com** (ej: `presupuestopro.com.ar` o `presupuestopro.app`)
2. En Vercel → tu proyecto → Settings → Domains
3. Agregá tu dominio
4. Vercel te dice qué DNS configurar en Namecheap
5. Esperá 5-30 minutos a que propague

---

## RESUMEN DE CUENTAS NECESARIAS (todas gratuitas)

| Servicio | URL | Para qué |
|----------|-----|----------|
| GitHub | github.com | Guardar el código |
| Supabase | supabase.com | Base de datos + auth |
| Vercel | vercel.com | Hosting del sitio |
| Node.js | nodejs.org | Correr el proyecto local |

## COSTO TOTAL: $0/mes
(Hasta que necesites dominio custom: ~$10/año)

---

*Guía v1.0 — PresupuestoPRO — 19/02/2026*
