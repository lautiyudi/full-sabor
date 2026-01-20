# Distribuidora Full Sabor (Tienda + Admin + WhatsApp)

Este proyecto es una tienda simple con carrito y checkout por WhatsApp + panel admin para cargar productos con fotos usando Supabase.

## 1) Requisitos
- Node.js 18+ (recomendado 20)
- Una cuenta de Supabase con:
  - tabla `products`
  - bucket `product-images` (public)
  - un usuario admin creado en Auth

## 2) Configurar variables de entorno
1. Copiá `.env.example` a `.env.local`
2. Pegá tus datos de Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3) Instalar y correr
```bash
npm install
npm run dev
```

Abrí:
- http://localhost:3000 (tienda)
- http://localhost:3000/admin (login)
- http://localhost:3000/admin/productos (panel productos)

## 4) Deploy
Podés desplegar en Netlify (con GitHub) o en Vercel.

En Netlify agregá las mismas variables de `.env.local` como Environment Variables.
