# Decisiones técnicas

Registro de decisiones y su porqué. Formato: fecha · decisión · motivo · alternativas descartadas.

## 2026-11-04 · Next.js full-stack para el MVP
**Motivo**: front y back en un solo proyecto, deploy simple en Vercel, muy valorado para el CV.
**Descartado**: front React + API NestJS separada (más robusto conceptualmente, pero más trabajo y mantenimiento para un MVP).

## 2026-11-04 · PostgreSQL (Neon) + Drizzle
**Motivo**: datos relacionales (artículos, clientes, pedidos); Neon permite ramas dev/prod y plan gratuito; Drizzle es tipado, liviano en serverless y con SQL explícito.
**Descartado**: Prisma (más pesado en serverless), Supabase (válido, pero más de lo necesario).

## 2026-11-04 · Kiosquero accede por link personal, sin cuenta
**Motivo**: cero fricción; el historial queda en el servidor asociado al cliente; el proveedor sabe quién pidió y puede desactivar el link.
**Descartado**: link público con historial en el navegador (frágil, anónimo).

## 2026-11-04 · Pedido guardado + aviso por WhatsApp (`wa.me`)
**Motivo**: respeta la costumbre del rubro y da trazabilidad.
**Descartado**: API de WhatsApp Business en la v1 (costo y complejidad).

## 2026-11-04 · Registro de proveedores sin aprobación
**Motivo**: simplicidad; el control de crecimiento se hará con planes y límites de uso más adelante.

## 2026-11-04 · Multi-tenant por columna `supplier_id`
**Motivo**: simple y suficiente para 10–50 proveedores. Todo acceso pasa por `src/lib/tenant.ts`.
**Posible mejora**: Row Level Security de Postgres.

## 2026-11-04 · Dinero en `numeric`, cantidades en `numeric(10,3)`
**Motivo**: evitar errores de redondeo de `float`; soportar venta por kilo.

## 2026-11-04 · Pedidos guardan copias de los datos del artículo
**Motivo**: los pedidos viejos y los reportes no cambian si el artículo cambia de precio, nombre, marca o categoría.

## 2026-11-04 · `id` interno + `code` visible en artículos
**Motivo**: el uuid nunca cambia y sostiene las relaciones; el código es lo que el proveedor maneja. Si no usa códigos, se generan cortos y legibles.

## 2026-11-04 · Marca y categoría opcionales con `NULL`
**Motivo**: no todos los proveedores clasifican; `NULL` evita registros falsos ("Sin marca") que ensucian filtros.

## 2026-11-04 · Historial de precios desde el día 1
**Motivo**: los datos que no se guardan no se recuperan; habilita deshacer y reportes.

## 2026-11-04 · IVA fuera del MVP
**Motivo**: falta conocer cómo opera el rubro; los precios se toman como finales. Se puede agregar con columnas nuevas sin migrar pedidos.

## 2026-11-04 · Presentación como texto (una presentación = un artículo)
**Motivo**: simple hasta tener el estudio de mercado; migrable a un modelo de variantes después.
