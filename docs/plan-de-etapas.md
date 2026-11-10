# Plan de etapas

Cada etapa termina desplegada, funcionando y con sus tests. Marcar `[x]` al completar cada tarea.

## Etapa 0 — Base

- [ ] Crear proyecto Next.js (App Router) + TypeScript estricto
- [x] Configurar ESLint y Prettier; scripts `lint`, `typecheck`, `test`
- [x] Instalar Tailwind y shadcn/ui
- [ ] Crear base en Neon con ramas `dev` y `main` (producción); `.env.example`
- [x] Configurar Drizzle y escribir el esquema completo (`docs/modelo-de-datos.md`)
- [x] Primera migración e índices (`supplier_id`, `pg_trgm` en `products.name`)
- [x] Helpers de acceso por proveedor (`src/lib/tenant.ts`)
- [x] Script de seed con datos realistas
- [ ] Configurar Vitest y un test de ejemplo
- [x] GitHub Actions: lint + typecheck + tests en cada push
- [x] Deploy en Vercel conectado al repo
- [x] README inicial

## Etapa 1 — Cuentas

- [x] Better Auth con email y contraseña
- [x] "Entrar con Google" (credenciales OAuth en Google Cloud Console)
- [x] Registro: crea `supplier` + `user` (owner), también en el primer ingreso con Google
- [x] Login, logout y protección de `/panel`
- [x] Recuperación de contraseña por email (Resend u otro)
- [x] Pantalla de configuración: nombre, WhatsApp, uso de marcas/categorías/códigos propios
- [x] Test e2e de registro y login

## Etapa 2 — Catálogo

- [x] ABM de categorías y marcas
- [x] Lista de artículos con TanStack Table: filtros, buscador, paginación
- [x] Alta y edición de artículo (por unidad y por peso)
- [x] Generación automática de códigos
- [x] Baja lógica y "sin stock"
- [x] Ocultar marca/categoría si el proveedor no las usa
- [x] Tests de normalización y generación de códigos

## Etapa 3 — Precios

- [x] Edición directa del precio en la lista (graba `price_changes`)
- [x] Selección múltiple y acciones masivas
- [x] Modal de aumento %: objetivo, redondeo, vista previa
- [x] Grabar `price_update_batches` + `price_changes`
- [x] Tests de `pricing.ts` (porcentajes, redondeo, centavos)

## Etapa 4 — Importación y exportación

- [x] Lectura de CSV y Excel
- [x] Mapeo de columnas y guardado del mapeo
- [x] Vista previa: crear / actualizar / errores / posibles duplicados
- [x] Modos de importación y opción para artículos ausentes
- [x] Aplicar importación en transacción + batch `import`
- [x] Exportación CSV y Excel (código como texto)
- [x] Tests con planillas de ejemplo (ceros a la izquierda, duplicados, celdas vacías)

## Etapa 5 — Clientes

- [x] ABM de clientes con lista y descuento
- [x] Generación de token, regeneración y desactivación
- [x] Botón "Enviar link por WhatsApp"
- [x] Rate limit y `noindex` en `/p/*`

## Etapa 6 — Pedido del cliente

- [ ] Catálogo móvil en `/p/[token]` con precios de su lista
- [ ] Borrador en servidor, + / −, barra de total
- [ ] Revisión y envío: congelar precios, número de pedido, abrir WhatsApp
- [ ] Historial, detalle y "repetir pedido"
- [ ] Aviso de precios cambiados y pantalla de link inactivo
- [ ] Test e2e: armar y enviar un pedido

## Etapa 7 — Gestión de pedidos

- [ ] Panel con filtros y pedidos sin respuesta destacados
- [ ] Detalle: transiciones de estado con `order_events`
- [ ] Pedir modificación, reemplazar artículos, ajustar cantidades
- [ ] Aceptar (fecha, descuento extra), pesar, entregar, pago
- [ ] Cargar pedido a nombre de un cliente
- [ ] Botones de aviso por WhatsApp
- [ ] Vista consolidada de artículos
- [ ] Control de ediciones simultáneas
- [ ] Tests de transiciones y permisos por estado

## Etapa 8 — Piloto

- [ ] Términos de uso y política de privacidad
- [ ] Sentry en producción
- [ ] Prueba con 1 o 2 proveedores reales
- [ ] Ajustes según feedback

## Etapa 9 — Después del MVP

Ver "Queda para después" en `requisitos.md`.
