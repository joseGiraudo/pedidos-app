"use server";

import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { customers } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { getCurrentTenant } from "@/lib/session";
import { assertOwned, tenantEq, withTenant } from "@/lib/tenant";
import { customerSchema, toCustomerValues, type CustomerFormValues } from "@/lib/validations/customer";

export type CustomerResult = { ok: true; id: string } | { error: string };
export type ToggleResult = { ok: true } | { error: string };

const SESSION_EXPIRED = "Tu sesión expiró. Volvé a iniciar sesión.";
const INVALID = "Revisá los datos ingresados.";

// ABM de clientes del proveedor logueado. El supplier_id sale de la sesión, nunca del
// cliente, y toda consulta se filtra con los helpers de tenant.ts.

/** Token aleatorio de 32 caracteres (24 bytes en base64url), único global. Ver seed.ts. */
function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createCustomer(values: CustomerFormValues): Promise<CustomerResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) return { error: INVALID };

  const dbValues = toCustomerValues(parsed.data);

  // El token es único global: ante la (muy improbable) colisión del UNIQUE, reintentamos
  // con otro token antes de rendirnos.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [row] = await db
        .insert(customers)
        .values(withTenant({ ...dbValues, accessToken: newAccessToken() }, tenant))
        .returning({ id: customers.id });
      revalidatePath("/panel/clientes");
      return { ok: true, id: row.id };
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }
  return { error: "No pudimos generar el link. Probá de nuevo." };
}

export async function updateCustomer(
  id: string,
  values: CustomerFormValues,
): Promise<CustomerResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  const [existing] = await db
    .select({ id: customers.id, supplierId: customers.supplierId })
    .from(customers)
    .where(and(eq(customers.id, id), tenantEq(customers, tenant)))
    .limit(1);
  assertOwned(existing, tenant);

  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) return { error: INVALID };

  await db
    .update(customers)
    .set(toCustomerValues(parsed.data))
    .where(and(eq(customers.id, id), tenantEq(customers, tenant)));

  revalidatePath("/panel/clientes");
  revalidatePath(`/panel/clientes/${id}/editar`);
  return { ok: true, id };
}

/**
 * Regenera el token de acceso del cliente: el link anterior deja de funcionar al instante.
 * Útil si el link se filtró o el proveedor quiere cortar el acceso sin dar de baja al cliente.
 */
export async function regenerateToken(id: string): Promise<ToggleResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  const [existing] = await db
    .select({ id: customers.id, supplierId: customers.supplierId })
    .from(customers)
    .where(and(eq(customers.id, id), tenantEq(customers, tenant)))
    .limit(1);
  assertOwned(existing, tenant);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db
        .update(customers)
        .set({ accessToken: newAccessToken() })
        .where(and(eq(customers.id, id), tenantEq(customers, tenant)));
      revalidatePath("/panel/clientes");
      return { ok: true };
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }
  return { error: "No pudimos regenerar el link. Probá de nuevo." };
}

/**
 * Baja lógica del cliente (nunca se borra). El `is_active` gobierna también el acceso por
 * link: al desactivar el cliente, su link deja de resolver (ver src/lib/customer-access.ts).
 */
export async function setCustomerActive(id: string, isActive: boolean): Promise<ToggleResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  const [existing] = await db
    .select({ id: customers.id, supplierId: customers.supplierId })
    .from(customers)
    .where(and(eq(customers.id, id), tenantEq(customers, tenant)))
    .limit(1);
  assertOwned(existing, tenant);

  await db
    .update(customers)
    .set({ isActive })
    .where(and(eq(customers.id, id), tenantEq(customers, tenant)));

  revalidatePath("/panel/clientes");
  return { ok: true };
}
