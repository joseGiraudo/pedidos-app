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
- [ ] "Entrar con Google" (credenciales OAuth en Google Cloud Console)
- [ ] Registro: crea `supplier` + `user` (owner), también en el primer ingreso con Google
- [x] Login, logout y protección de `/panel`
- [ ] Recuperación de contraseña por email (Resend u otro)
- [ ] Pantalla de configuración: nombre, WhatsApp, uso de marcas/categorías/códigos propios
- [ ] Test e2e de registro y login

## Etapa 2 — Catálogo

- [ ] ABM de categorías y marcas
- [ ] Lista de artículos con TanStack Table: filtros, buscador, paginación
- [ ] Alta y edición de artículo (por unidad y por peso)
- [ ] Generación automática de códigos
- [ ] Baja lógica y "sin stock"
- [ ] Ocultar marca/categoría si el proveedor no las usa
- [ ] Tests de normalización y generación de códigos

## Etapa 3 — Precios

- [ ] Edición directa del precio en la lista (graba `price_changes`)
- [ ] Selección múltiple y acciones masivas
- [ ] Modal de aumento %: objetivo, redondeo, vista previa
- [ ] Grabar `price_update_batches` + `price_changes`
- [ ] Tests de `pricing.ts` (porcentajes, redondeo, centavos)

## Etapa 4 — Importación y exportación

- [ ] Lectura de CSV y Excel
- [ ] Mapeo de columnas y guardado del mapeo
- [ ] Vista previa: crear / actualizar / errores / posibles duplicados
- [ ] Modos de importación y opción para artículos ausentes
- [ ] Aplicar importación en transacción + batch `import`
- [ ] Exportación CSV y Excel (código como texto)
- [ ] Tests con planillas de ejemplo (ceros a la izquierda, duplicados, celdas vacías)

## Etapa 5 — Clientes

- [ ] ABM de clientes con lista y descuento
- [ ] Generación de token, regeneración y desactivación
- [ ] Botón "Enviar link por WhatsApp"
- [ ] Rate limit y `noindex` en `/p/*`

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
