# Pedidos para proveedores de kioscos (nombre a definir)

Webapp para que proveedores de kioscos y almacenes gestionen su lista de artículos y precios, y la compartan con sus clientes mediante un link personal para recibir pedidos ordenados, sin que el kiosquero tenga que crear una cuenta.

> 🚧 MVP en desarrollo. Demo y capturas próximamente.

## Funcionalidades (MVP)

- Catálogo con marcas y categorías opcionales, artículos por unidad y por peso
- Aumentos masivos por porcentaje con vista previa y redondeo
- Importación desde la planilla propia del proveedor (CSV / Excel)
- Link personal por cliente, sin registro
- Armado de pedido desde el celular y envío por WhatsApp
- Gestión de pedidos con estados, reemplazos, pesaje, entrega y cobro

## Stack

Next.js · TypeScript · PostgreSQL (Neon) · Drizzle · Better Auth · Tailwind · shadcn/ui · Vitest · Playwright · Vercel

## Cómo levantarlo

```bash
npm install
cp .env.example .env.local   # completar variables
npm run db:migrate
npm run db:seed
npm run dev
```

## Documentación

- [Requisitos](docs/requisitos.md)
- [Modelo de datos](docs/modelo-de-datos.md)
- [Reglas de negocio](docs/reglas-de-negocio.md)
- [Plan de etapas](docs/plan-de-etapas.md)
- [Decisiones técnicas](docs/DECISIONES.md)
