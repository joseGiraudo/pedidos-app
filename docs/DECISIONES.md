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

## 2026-11-04 · Login con email y contraseña + Google

**Motivo**: reducir la fricción de entrada; muchos proveedores tienen Gmail y así no necesitan recordar otra contraseña. En el modelo es solo otra fila en `account`.
**Descartado por ahora**: código por WhatsApp o SMS (costo por mensaje y más complejidad); link mágico por email (depende de que revisen el correo).

## 2026-11-04 · Multi-tenant por columna `supplier_id`

**Motivo**: simple y suficiente para 10–50 proveedores. Todo acceso pasa por `src/lib/tenant.ts`.
**Posible mejora**: Row Level Security de Postgres.

## 2026-11-04 · `tenant.ts` como primitivas tipadas con contexto explícito

**Motivo**: `tenant.ts` expone primitivas chicas —`tenantEq` (WHERE por `supplier_id`), `withTenant`
(estampa el proveedor al insertar) y `assertOwned` (guarda de pertenencia tras leer por `id`)— en vez
de una capa de repositorios por entidad, que obligaría a adivinar interfaces antes de tener las
pantallas. El proveedor viaja en un contexto explícito `Tenant = { supplierId }`; `getCurrentTenant()`
desde la sesión de Better Auth se agrega en Etapa 1.
**Descartado por ahora**: repositorios por entidad (`productsRepo(tenant).list()`…).

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

## 2026-11-04 · Driver Drizzle: `neon-serverless` (Pool/WebSockets), no `neon-http`

**Motivo**: la app necesita **transacciones interactivas** (varias consultas dentro de una misma
transacción con lógica en el medio): importación de planillas, aumentos masivos con historial,
numeración de pedidos con `next_order_number` y transiciones de estado con `order_events`.
`drizzle-orm/neon-serverless` sobre `Pool` de `@neondatabase/serverless` las soporta; `neon-http` no.
La app usa la conexión pooled (`DATABASE_URL`); `drizzle-kit` usa la directa (`DATABASE_URL_UNPOOLED`).
**Descartado**: `neon-http` (más liviano pero sin transacciones interactivas).

## 2026-11-04 · `order_items` y `price_changes` sin `supplier_id`

**Motivo**: son tablas hijas a las que siempre se llega por su padre (`orders` / `products`, que sí
tienen `supplier_id`). La aislación por proveedor la impone `src/lib/tenant.ts` por join, sin
denormalizar la columna. `order_events` sí lleva `supplier_id` porque se consulta como feed directo.
**Matiz de la regla** "toda tabla de negocio tiene `supplier_id`": aplica a las tablas raíz; las hijas
puras heredan la tenencia del padre.

## 2026-11-04 · Índice `pg_trgm` sobre `products.name` desde la primera migración

**Motivo**: el buscador del catálogo filtra por nombre con coincidencias parciales; un índice GIN
`gin_trgm_ops` lo hace rápido con 1.000+ artículos. La migración `0000` crea
`CREATE EXTENSION IF NOT EXISTS pg_trgm` (drizzle-kit no lo agrega solo).

## 2026-11-04 · Enums como `pgEnum`; `updated_at` vía `$onUpdate`

**Motivo**: los estados cerrados (estado de pedido, listas, etc.) van como enums nativos de Postgres
(`pgEnum`) para integridad en la base. `updated_at` se refresca con `.$onUpdate()` a nivel ORM (no
trigger); alcanza porque toda escritura pasa por Drizzle.

## 2026-11-04 · Tablas de Better Auth diferidas a Etapa 1

**Motivo**: las genera la CLI de Better Auth y no se editan a mano. En la primera migración las
columnas que apuntan a un usuario (`created_by`, `actor_user_id`) quedan como `text` **sin FK**; las
tablas `user`/`account`/`session`/`verification` y sus FKs se agregan al configurar Better Auth.

## 2026-11-04 · Better Auth con email y contraseña (Etapa 1)

**Motivo**: autenticación de proveedores sobre el stack elegido. Se instala `better-auth` con el
adaptador `drizzleAdapter(db, { provider: "pg", schema })`, reutilizando el `db` (Pool de Neon) y el
barrel del esquema. La config vive en `src/lib/auth.ts` y se monta en `/api/auth/[...all]`
(`toNextJsHandler`). Solo email y contraseña por ahora; Google, registro, login/logout, protección de
`/panel` y la recuperación por email quedan para las tareas siguientes de la etapa.
**Tablas**: `user`/`account`/`session`/`verification` se generan con `npx @better-auth/cli generate`
en un **único** `src/db/schema/auth.ts` (no se editan a mano salvo los campos adicionales de `user`).
Los `timestamp` que emite la CLI quedan **sin** `timestamptz` (convención propia de Better Auth); se
aceptan así para no tocar tablas gestionadas por su CLI y poder regenerarlas sin fricción.
**Campos adicionales de `user`**: `supplier_id` se declara en `auth.ts` como `uuid NOT NULL` con FK a
`suppliers.id` (Better Auth lo maneja como string; `required: true, input: false` para que lo
inyecte el registro, no el cliente) e índice `user_supplier_id_idx`; `role` como enum `user_role`
(`owner`/`staff`, default `owner`). Nace `NOT NULL` porque la tabla está vacía y el registro lo
poblará vía hook.
**FKs cerradas**: `price_update_batches.created_by`, `price_changes.created_by` y
`order_events.actor_user_id` (todas `text`) ahora referencian `user.id`. Cierra la deuda de la entrada
"Tablas de Better Auth diferidas a Etapa 1". Migración `0001_dear_deathbird.sql`.
**Descartado por ahora**: tabla `users` propia (ver entrada de modelo de datos); dividir las tablas de
Better Auth en un archivo por tabla (complica regenerar con la CLI).

## 2026-11-04 · UI con shadcn/ui (Base UI) + React Hook Form + Zod

**Motivo**: se inicializa shadcn/ui para todas las pantallas. La versión actual del CLI (`shadcn@4`)
genera componentes sobre **@base-ui/react** (no Radix) y usa `cn` del paquete `cn`, `lucide-react`,
`class-variance-authority` y `tw-animate-css`. Los componentes viven en `src/components/ui`. Formularios
con React Hook Form + `@hookform/resolvers` validando contra esquemas Zod. Nota: el componente `form`
del registro no se generó con el CLI; los formularios se arman con RHF directo sobre `Input`/`Label`/
`Button` y mensajes de error propios.
**Esquemas de validación**: en `src/lib/validations/` (p. ej. `auth.ts`), compartidos entre cliente
(RHF) y servidor (server actions y hooks de Better Auth), para validar una sola vez la misma forma.

## 2026-11-04 · Registro crea supplier + user (owner) con un hook de Better Auth

**Motivo**: `user.supplier_id` es `NOT NULL` con FK, así que el supplier debe existir al insertar el
user. Se resuelve con `databaseHooks.user.create.before`: lee del body del alta el nombre del comercio
y el WhatsApp (el body de `signUpEmail` es `z.object(...).and(z.record(...))`, conserva campos extra),
los valida con `supplierSignupSchema`, crea el `supplier` e inyecta `supplierId` en el user. Así
`supplier_id` y `role` quedan como `input: false` (no los setea el cliente). El alta es una **server
action** que valida con `registerSchema` y llama `auth.api.signUpEmail`; el plugin `nextCookies()`
persiste la cookie de sesión y luego redirige a `/panel`. Pantalla en `src/app/(auth)/registro`.
**Alcance**: solo email y contraseña. "Entrar con Google" (y el alta de supplier en el primer ingreso
con Google), login/logout, protección de `/panel` por middleware y recuperación por email quedan para
las tareas siguientes de la Etapa 1. `/panel` tiene por ahora un guard mínimo de sesión.
**Descartado**: pasar `supplier_id` por el cliente en el signup (inseguro: permitiría adjuntarse a otro
proveedor); crear el user primero y actualizar después (imposible con `NOT NULL`).

## 2026-11-04 · Login, logout y protección de /panel

**Motivo**: login y logout como **server actions** (`auth.api.signInEmail` / `auth.api.signOut`),
igual que el registro, validando con Zod (`loginSchema`) y con `nextCookies()` manejando la cookie.
El error de credenciales es genérico ("Email o contraseña incorrectos") para no filtrar qué campo
falló. **Protección de `/panel`** con un `src/middleware.ts` que hace un chequeo optimista de la cookie
con `getSessionCookie` (apto para edge, sin tocar la base); la validación real contra la base la hace
la página con `auth.api.getSession` (defensa en profundidad). Las páginas `/login` y `/registro`
redirigen a `/panel` si ya hay sesión. Logout con `<form action={logout}>` en el panel.
**Descartado**: validar la sesión contra la base dentro del middleware (no se puede en edge sin el
driver; además el chequeo de cookie + validación en la página alcanza).

## 2026-11-04 · Recuperación de contraseña por email (Resend)

**Motivo**: se usa el flujo nativo de Better Auth: `requestPasswordReset` genera un token (tabla
`verification`, un solo uso, vence en 1 h) y llama a `emailAndPassword.sendResetPassword`, que envía el
link; la página `/reset-password` recibe el token y `resetPassword` fija la nueva clave. Envío de
emails con **Resend** vía `src/lib/email.ts`; si no hay `RESEND_API_KEY` (desarrollo), el link se
**imprime por consola** en vez de enviarse, así el flujo es probable sin configurar nada. `EMAIL_FROM`
configurable (default: dominio de prueba de Resend). Se activa `revokeSessionsOnPasswordReset` para
cerrar las demás sesiones al cambiar la clave. Pantallas `/recuperar` y `/reset-password`; el pedido no
revela si el email existe. Server actions con Zod (`forgotPasswordSchema`, `resetPasswordSchema` con
confirmación).
**Descartado por ahora**: SMTP propio (Nodemailer) y verificación de email en el alta (no se exige).

## 2026-11-04 · Pantalla de configuración y `getCurrentTenant()`

**Motivo**: `/panel/configuracion` edita el `supplier` logueado: nombre, WhatsApp y los flags
`use_brands` / `use_categories` / `uses_own_codes`. Se agrega `src/lib/session.ts` con `getSession()` y
`getCurrentTenant()` (arma el `Tenant` desde la sesión de Better Auth) — lo que `tenant.ts` dejaba
pendiente para la Etapa 1. La server action `saveConfig` toma el `supplier_id` **de la sesión** (nunca
del cliente), valida con Zod (`supplierConfigSchema`, reusa `normalizeWhatsapp`) y actualiza por
`eq(suppliers.id, tenant.supplierId)` (la tabla raíz se filtra por su `id`, no por `supplier_id`).
Los tres flags se editan con checkboxes nativos registrados con React Hook Form (evita `Controller` y
componentes extra). `logo_url` queda fuera (imágenes son post-MVP).

## 2026-11-04 · "Entrar con Google" y `whatsapp_phone` opcional

**Motivo**: se agrega Google como `socialProviders.google` (solo si están `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET`; si no, el provider se omite y las pantallas no muestran el botón). El flujo
OAuth no pasa por el formulario de registro, así que el hook `user.create.before` ahora ramifica: si el
body trae nombre de comercio + WhatsApp válidos (alta por email), los usa; si es el alta por email y
faltan, 400; en cualquier otro caso (alta social) crea el `supplier` con el nombre derivado del perfil
de Google y **WhatsApp vacío**. Para eso `suppliers.whatsapp_phone` pasó a **nullable** (migración
`0002`); el usuario de Google completa el WhatsApp en Configuración (que lo exige al guardar). El
registro por email lo sigue pidiendo. Botón `signIn.social({ provider: "google", callbackURL: "/panel" })`.
**Pendiente de verificación en vivo**: el callback real requiere credenciales de Google + navegador.
**Nota**: Next 16 deprecó el archivo `middleware` a favor de `proxy` (solo warning; sigue funcionando).

## 2026-11-04 · Tests e2e con Playwright

**Motivo**: `e2e/` con Playwright (Chromium) cubre registro, login/logout, protección de `/panel` y
error de credenciales — incluye los submits de formularios y server actions que no se podían ejercitar
por HTTP. `playwright.config.ts` levanta el dev server (`webServer`, `reuseExistingServer` en local) y
corre secuencial (`workers: 1`) porque comparten la **dev de Neon**. Timeouts holgados (15 s) por la
compilación on-demand del dev server en el primer uso. Los tests crean usuarios reales con emails
`e2e-*@example.com` y un `globalTeardown` los borra al final (importa las tablas desde sus archivos,
no del barrel, porque el runner no resuelve bien `export *`). Google queda fuera del e2e (el callback
real necesita credenciales + cuenta Google). **No** se corre en CI por ahora (no hay base de test ni
browsers en el workflow); se corre local con `npm run test:e2e`.

## 2026-11-04 · Seed artesanal con reset en transacción

**Motivo**: `src/db/seed.ts` recarga la base dev con datos realistas de kiosco argentino (1 proveedor,
~200 artículos con variedad por peso / sin marca / sin stock, clientes de ambas listas) armados a mano,
sin faker, para que sean creíbles y reproducibles. Cada corrida borra las tablas de negocio en orden de
FKs y reinserta dentro de una transacción, así es idempotente. Corre con `tsx` (script `db:seed`) y
carga `.env.local` con `dotenv`.
**Fuera del seed**: pedidos, `price_changes` y `price_update_batches` — necesitan `user.id`, que recién
existe con Better Auth (Etapa 1).

## 2026-11-04 · ABM de categorías y marcas (Etapa 2)

**Motivo**: primera tarea del catálogo. Pantallas `/panel/categorias` y `/panel/marcas` para el alta,
edición, borrado y (solo categorías) reordenamiento. Server actions con `getCurrentTenant()` y los
helpers de `tenant.ts`; validación compartida en `src/lib/validations/catalog.ts` (`normalizeName`
recorta y colapsa espacios —no pasa a mayúsculas, eso es solo para `code` de productos— y
`taxonomyNameSchema`). El `unique(supplier_id, name)` de la base atrapa duplicados: las actions
traducen el SQLSTATE `23505` (`src/lib/db-errors.ts`) a un mensaje claro.
**Borrado**: `categories`/`brands` no tienen `is_active`, así que el borrado es **físico**. Como los
productos las referencian con FK nullable (`NULL` = sin categoría/marca), al borrar se **reasignan a
`NULL`** los artículos y luego se elimina la fila, todo en una transacción. La pantalla avisa cuántos
artículos quedarán sin categoría/marca antes de confirmar.
**Reorden de categorías**: botones ↑/↓; `moveCategory` reindexa `sort_order` 0..n-1 sobre la lista
reordenada (robusto frente a `sort_order` repetidos que pudiera traer el seed). Las marcas no se ordenan.
**Visibilidad por flags**: las pantallas se guardan con `use_categories` / `use_brands` del proveedor
(redirigen a `/panel` si están en off) y los links del panel solo aparecen si el flag está activo
(regla "ocultar marca/categoría si el proveedor no las usa").
**UI**: componente cliente compartido `src/app/panel/_components/taxonomy-manager.tsx` (edición inline,
confirmación de borrado con conteo, `useTransition` + `router.refresh()`), reutilizado por ambas
pantallas con las server actions pasadas como props. Primer uso real de sonner: se montó `<Toaster />`
en el layout raíz.
**Descartado**: bloquear el borrado si la categoría/marca está en uso (más fricción); `window.confirm`
y un componente `dialog` nuevo (la confirmación inline alcanza sin sumar dependencias).
