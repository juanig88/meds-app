# Configuración de Supabase y Google Login

## 1. Proyecto en Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En **Project Settings → API** copiá:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Variables de entorno

Copiá `.env.local.example` a `.env.local` y completá:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 3. Base de datos

En el **SQL Editor** de Supabase, ejecutá el contenido del archivo:

`supabase/migrations/001_meds_tracker.sql`

Eso crea las tablas `patients`, `medications` y `doses` con RLS (cada usuario solo ve sus datos).

## 4. Login con Google

1. En Supabase: **Authentication → Providers** activá **Google**.
2. En [Google Cloud Console](https://console.cloud.google.com/):
   - Creá un proyecto o elegí uno existente.
   - **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Tipo: **Web application**.
   - **Authorized redirect URIs** agregá la URL que te indica Supabase (algo como `https://xxxxx.supabase.co/auth/v1/callback`).
   - Copiá **Client ID** y **Client Secret** a Supabase en el provider de Google.
3. En Supabase: **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (desarrollo) o tu dominio en producción.
   - **Redirect URLs**: agregá `http://localhost:3000/auth/callback` y en producción `https://tudominio.com/auth/callback`.

## 5. Instalar dependencias y correr

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000` y usá **Entrar con Google**. Los datos se guardan en Supabase por usuario.
