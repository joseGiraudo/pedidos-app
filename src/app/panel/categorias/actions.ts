"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { getCurrentTenant } from "@/lib/session";
import { tenantEq, withTenant } from "@/lib/tenant";
import { taxonomyNameSchema, type TaxonomyNameFormValues } from "@/lib/validations/catalog";

export type CatalogResult = { ok: true } | { error: string };

const SESSION_EXPIRED = "Tu sesión expiró. Volvé a iniciar sesión.";
const DUPLICATE = "Ya existe una categoría con ese nombre.";

// ABM de categorías del proveedor logueado. El supplier_id sale de la sesión, nunca
// del cliente, y toda consulta se filtra con los helpers de tenant.ts.

export async function createCategory(values: TaxonomyNameFormValues): Promise<CatalogResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  const parsed = taxonomyNameSchema.safeParse(values);
  if (!parsed.success) return { error: "Revisá el nombre ingresado." };

  const [{ value }] = await db
    .select({ value: max(categories.sortOrder) })
    .from(categories)
    .where(tenantEq(categories, tenant));
  const sortOrder = (value ?? -1) + 1;

  try {
    await db.insert(categories).values(withTenant({ name: parsed.data.name, sortOrder }, tenant));
  } catch (error) {
    if (isUniqueViolation(error)) return { error: DUPLICATE };
    throw error;
  }

  revalidatePath("/panel/categorias");
  return { ok: true };
}

export async function renameCategory(
  id: string,
  values: TaxonomyNameFormValues,
): Promise<CatalogResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  const parsed = taxonomyNameSchema.safeParse(values);
  if (!parsed.success) return { error: "Revisá el nombre ingresado." };

  try {
    await db
      .update(categories)
      .set({ name: parsed.data.name })
      .where(and(eq(categories.id, id), tenantEq(categories, tenant)));
  } catch (error) {
    if (isUniqueViolation(error)) return { error: DUPLICATE };
    throw error;
  }

  revalidatePath("/panel/categorias");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<CatalogResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  // Los artículos quedan "sin categoría" (NULL); la categoría se borra. En transacción
  // para no dejar productos apuntando a una categoría inexistente.
  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({ categoryId: null })
      .where(and(eq(products.categoryId, id), tenantEq(products, tenant)));
    await tx.delete(categories).where(and(eq(categories.id, id), tenantEq(categories, tenant)));
  });

  revalidatePath("/panel/categorias");
  return { ok: true };
}

export async function moveCategory(
  id: string,
  direction: "up" | "down",
): Promise<CatalogResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(tenantEq(categories, tenant))
      .orderBy(categories.sortOrder, categories.name);

    const index = rows.findIndex((r) => r.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= rows.length) return;

    [rows[index], rows[target]] = [rows[target], rows[index]];

    // Reindexar 0..n-1 deja el orden consistente aunque el seed trajera sort_order repetidos.
    for (let i = 0; i < rows.length; i++) {
      await tx
        .update(categories)
        .set({ sortOrder: i })
        .where(and(eq(categories.id, rows[i].id), tenantEq(categories, tenant)));
    }
  });

  revalidatePath("/panel/categorias");
  return { ok: true };
}
