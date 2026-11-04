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

## Requisitos

- Node.js 22+
- Una base PostgreSQL en [Neon](https://neon.tech) (plan gratuito alcanza)

## Cómo levantarlo

```bash
npm install
cp .env.example .env.local   # completar DATABASE_URL y DATABASE_URL_UNPOOLED
npm run db:migrate           # crea las tablas
npm run db:seed              # datos de prueba (opcional)
npm run dev                  # http://localhost:3000
```

Las dos variables salen del dashboard de Neon: `DATABASE_URL` es la conexión _pooled_ (la usa la app) y `DATABASE_URL_UNPOOLED` la directa (la usa Drizzle Kit para migraciones).

## Scripts

| Comando               | Qué hace                                      |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | Servidor de desarrollo                        |
| `npm run build`       | Build de producción                           |
| `npm run lint`        | ESLint                                        |
| `npm run typecheck`   | `tsc --noEmit`                                |
| `npm run test`        | Tests unitarios (Vitest)                      |
| `npm run format`      | Formatea con Prettier                         |
| `npm run db:generate` | Genera una migración desde el esquema Drizzle |
| `npm run db:migrate`  | Aplica las migraciones                        |
| `npm run db:seed`     | Carga datos de prueba                         |
| `npm run db:studio`   | Drizzle Studio (explorador de la base)        |

El CI (GitHub Actions) corre `lint`, `typecheck` y `test` en cada push.

## Documentación

- [Requisitos](docs/requisitos.md)
- [Modelo de datos](docs/modelo-de-datos.md)
- [Reglas de negocio](docs/reglas-de-negocio.md)
- [Plan de etapas](docs/plan-de-etapas.md)
- [Decisiones técnicas](docs/DECISIONES.md)
