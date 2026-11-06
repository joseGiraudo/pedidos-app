# CLAUDE.md

Webapp multi-proveedor para que proveedores de kioscos y almacenes gestionen su lista de artículos y precios, y la compartan con sus clientes (kiosqueros) mediante un link personal para que hagan el pedido semanal desde el celular. MVP en desarrollo.

## Stack

- Next.js (App Router) + TypeScript (modo estricto)
- Tailwind + shadcn/ui · TanStack Table · React Hook Form + Zod
- PostgreSQL en Neon · Drizzle ORM (migraciones versionadas)
- Better Auth (email y contraseña + Google, solo proveedores)
- Papa Parse + SheetJS (CSV y Excel)
- Vitest (unitarios) + Playwright (end-to-end)
- GitHub Actions (CI) · Vercel (hosting)

## Comandos

> Actualizar esta sección cuando cambien los scripts de `package.json`.

- `npm run dev` — servidor de desarrollo
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm run test` — Vitest
- `npm run test:e2e` — Playwright
- `npm run db:generate` — generar migración desde el esquema de Drizzle
- `npm run db:migrate` — aplicar migraciones
- `npm run db:seed` — cargar datos de prueba

## Estructura

```
src/
  app/
    (auth)/          registro y login
    panel/           panel del proveedor
    p/[token]/       vista del kiosquero (sin cuenta)
    admin/           administrador de la plataforma
  components/        componentes de UI
  db/
    schema/          esquema Drizzle, un archivo por tabla
    migrations/
    seed.ts
  lib/
    tenant.ts        acceso a datos filtrado por proveedor
    pricing.ts       cálculo de precios, descuentos y totales
    import/          importación de planillas
docs/                requisitos, modelo de datos, reglas, plan, decisiones
```

## Reglas que no se rompen

- **Código en inglés, pantallas en castellano** (Argentina: `$`, coma decimal, fechas dd/mm/aaaa).
- **Multi-tenant**: toda tabla de negocio tiene `supplier_id`. Ninguna consulta del panel se hace sin filtrar por el proveedor logueado; usar siempre las funciones de `src/lib/tenant.ts`, nunca consultas sueltas.
- **Dinero**: `numeric` en la base, nunca `float`. En TypeScript operar en centavos enteros o con librería decimal.
- **Cantidades**: `numeric(10,3)` (hay artículos por kilo).
- **Totales siempre en el servidor**: nunca confiar en precios o totales que mande el cliente.
- **Pedidos guardan copias**: cada línea copia código, nombre, presentación, marca, categoría y precio al enviarse.
- **Baja lógica**: artículos y clientes se desactivan (`is_active`), nunca se borran.
- **Código de artículo**: `id` uuid interno; `code` visible, único por proveedor y normalizado (trim + mayúsculas). Si el proveedor no usa códigos, se generan.
- **Marca y categoría opcionales**: `NULL` significa "Sin marca" / "Sin categoría". No crear registros falsos.
- **Link del kiosquero**: token aleatorio de 32+ caracteres; páginas `/p/*` con `noindex`.
- Validar toda entrada con Zod.

## Cómo trabajar

- Antes de una tarea, leer la parte de `docs/` que corresponda (no todo).
- Tareas chicas: una por sesión, un commit al terminar (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- **Nunca incluir a Claude/el asistente en commits, pushes ni pull requests**: sin línea `Co-Authored-By: Claude`, sin menciones de "Generated with Claude Code" ni nada por el estilo. Los commits y PRs van solo a nombre del autor humano.
- La lógica de cálculo (`pricing.ts`, importación, transiciones de estado) lleva tests unitarios.
- **Antes de dar algo por terminado**: correr `npm run typecheck`, `npm run lint` y `npm run test`.
- Al cerrar una tarea: marcarla en `docs/plan-de-etapas.md` y, si hubo una decisión técnica, anotarla en `docs/DECISIONES.md`.
- No "mejorar" algo que figure en `DECISIONES.md` sin preguntar.
- No leer ni modificar `.env` / `.env.local`; usar `.env.example` como referencia.

## Documentación

- `docs/requisitos.md` — qué hace el sistema
- `docs/modelo-de-datos.md` — tablas, campos y decisiones de diseño
- `docs/reglas-de-negocio.md` — estados del pedido, cálculos, formatos CSV y WhatsApp
- `docs/plan-de-etapas.md` — hoja de ruta con tareas
- `docs/DECISIONES.md` — registro de decisiones técnicas
