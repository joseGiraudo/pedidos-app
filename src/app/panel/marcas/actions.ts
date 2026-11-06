"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { brands, products } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { getCurrentTenant } from "@/lib/session";
import { tenantEq, withTenant } from "@/lib/tenant";
import { taxonomyNameSchema, type TaxonomyNameFormValues } from "@/lib/validations/catalog";

export type CatalogResult = { ok: true } | { error: string };

const SESSION_EXPIRED = "Tu sesión expiró. Volvé a iniciar sesión.";
const DUPLICATE = "Ya existe una marca con ese nombre.";

// ABM de marcas del proveedor logueado. El supplier_id sale de la sesión, nunca del
// cliente, y toda consulta se filtra con los helpers de tenant.ts.

export async function createBrand(values: TaxonomyNameFormValues): Promise<CatalogResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  const parsed = taxonomyNameSchema.safeParse(values);
  if (!parsed.success) return { error: "Revisá el nombre ingresado." };

  try {
    await db.insert(brands).values(withTenant({ name: parsed.data.name }, tenant));
  } catch (error) {
    if (isUniqueViolation(error)) return { error: DUPLICATE };
    throw error;
  }

  revalidatePath("/panel/marcas");
  return { ok: true };
}

export async function renameBrand(
  id: string,
  values: TaxonomyNameFormValues,
): Promise<CatalogResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  const parsed = taxonomyNameSchema.safeParse(values);
  if (!parsed.success) return { error: "Revisá el nombre ingresado." };

  try {
    await db
      .update(brands)
      .set({ name: parsed.data.name })
      .where(and(eq(brands.id, id), tenantEq(brands, tenant)));
  } catch (error) {
    if (isUniqueViolation(error)) return { error: DUPLICATE };
    throw error;
  }

  revalidatePath("/panel/marcas");
  return { ok: true };
}

export async function deleteBrand(id: string): Promise<CatalogResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  // Los artículos quedan "sin marca" (NULL); la marca se borra. En transacción para no
  // dejar productos apuntando a una marca inexistente.
  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({ brandId: null })
      .where(and(eq(products.brandId, id), tenantEq(products, tenant)));
    await tx.delete(brands).where(and(eq(brands.id, id), tenantEq(brands, tenant)));
  });

  revalidatePath("/panel/marcas");
  return { ok: true };
}
