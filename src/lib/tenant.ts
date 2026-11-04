import { eq, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

// Acceso a datos filtrado por proveedor (multi-tenant). Toda consulta del panel
// debe pasar por estos helpers; nunca una consulta suelta sin filtrar por supplier_id.
//
// `order_items` y `price_changes` NO tienen supplier_id: se acceden por su padre
// (`orders` / `products`), que sí lo tiene. Para cortar accesos cruzados tras leer
// por id, usar `assertOwned` sobre el padre.
//
// Better Auth llega en Etapa 1: ahí se agrega `getCurrentTenant()`, que arma el
// `Tenant` desde la sesión. Por ahora el contexto se pasa explícito.

/** Contexto del proveedor logueado. */
export type Tenant = { supplierId: string };

/** Acceso a datos de otro proveedor (o fila inexistente). */
export class TenantAccessError extends Error {
  constructor(message = "Acceso denegado: el recurso no pertenece al proveedor") {
    super(message);
    this.name = "TenantAccessError";
  }
}

/** Tabla raíz del tenant: tiene columna `supplier_id`. */
type TenantScopedTable = PgTable & { supplierId: PgColumn };

/** Condición WHERE que filtra una tabla por el proveedor del tenant. */
export function tenantEq(table: TenantScopedTable, tenant: Tenant): SQL {
  return eq(table.supplierId, tenant.supplierId);
}

/** Estampa `supplierId` en los valores a insertar (pisa cualquier valor previo). */
export function withTenant<T extends Record<string, unknown>>(
  values: T,
  tenant: Tenant,
): T & { supplierId: string } {
  return { ...values, supplierId: tenant.supplierId };
}

/**
 * Garantiza que una fila exista y pertenezca al tenant; si no, lanza
 * `TenantAccessError`. Pensado para usar tras leer un registro por su `id`.
 */
export function assertOwned<T extends { supplierId: string }>(
  row: T | null | undefined,
  tenant: Tenant,
): T {
  if (!row || row.supplierId !== tenant.supplierId) {
    throw new TenantAccessError();
  }
  return row;
}
