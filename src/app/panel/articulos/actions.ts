"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { products, suppliers } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { getCurrentTenant } from "@/lib/session";
import { assertOwned, tenantEq, withTenant } from "@/lib/tenant";
import {
  makeProductSchema,
  nextGeneratedCode,
  normalizeCode,
  toProductValues,
  type ProductFormValues,
} from "@/lib/validations/catalog";

export type ProductResult = { ok: true; id: string } | { error: string };

const SESSION_EXPIRED = "Tu sesión expiró. Volvé a iniciar sesión.";
const DUPLICATE_CODE = "Ya existe un artículo con ese código.";
const INVALID = "Revisá los datos ingresados.";

// Alta y edición de artículos del proveedor logueado. El supplier_id sale de la sesión,
// nunca del cliente, y toda consulta se filtra con los helpers de tenant.ts.

async function getSupplierFlag(supplierId: string): Promise<{ usesOwnCodes: boolean } | null> {
  const [row] = await db
    .select({ usesOwnCodes: suppliers.usesOwnCodes })
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);
  return row ?? null;
}

export async function createProduct(values: ProductFormValues): Promise<ProductResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  const supplier = await getSupplierFlag(tenant.supplierId);
  if (!supplier) return { error: SESSION_EXPIRED };

  const parsed = makeProductSchema(supplier.usesOwnCodes).safeParse(values);
  if (!parsed.success) return { error: INVALID };

  const dbValues = toProductValues(parsed.data);

  try {
    const id = await db.transaction(async (tx) => {
      let code: string;
      let codeIsGenerated: boolean;

      if (supplier.usesOwnCodes) {
        code = normalizeCode(parsed.data.code);
        codeIsGenerated = false;
      } else {
        // El sistema genera el código. Bloquea la fila del proveedor para que dos altas
        // concurrentes no elijan el mismo número, y salta los códigos ya tomados (p. ej. un
        // código propio numérico o un generado del seed) para no fallar por una colisión.
        const [{ from }] = await tx
          .select({ from: suppliers.nextProductCode })
          .from(suppliers)
          .where(eq(suppliers.id, tenant.supplierId))
          .for("update");

        const rows = await tx
          .select({ code: products.code })
          .from(products)
          .where(tenantEq(products, tenant));
        const taken = new Set(rows.map((r) => r.code));

        const gen = nextGeneratedCode(from, (c) => taken.has(c));
        code = gen.code;
        codeIsGenerated = true;

        await tx
          .update(suppliers)
          .set({ nextProductCode: gen.next })
          .where(eq(suppliers.id, tenant.supplierId));
      }

      const [row] = await tx
        .insert(products)
        .values(withTenant({ ...dbValues, code, codeIsGenerated }, tenant))
        .returning({ id: products.id });
      return row.id;
    });

    revalidatePath("/panel/articulos");
    return { ok: true, id };
  } catch (error) {
    if (isUniqueViolation(error)) return { error: DUPLICATE_CODE };
    throw error;
  }
}

export async function updateProduct(
  id: string,
  values: ProductFormValues,
): Promise<ProductResult> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { error: SESSION_EXPIRED };

  const supplier = await getSupplierFlag(tenant.supplierId);
  if (!supplier) return { error: SESSION_EXPIRED };

  const [existing] = await db
    .select({ id: products.id, supplierId: products.supplierId })
    .from(products)
    .where(and(eq(products.id, id), tenantEq(products, tenant)))
    .limit(1);
  assertOwned(existing, tenant);

  const parsed = makeProductSchema(supplier.usesOwnCodes).safeParse(values);
  if (!parsed.success) return { error: INVALID };

  const dbValues = toProductValues(parsed.data);
  // El código solo se edita si el proveedor usa códigos propios; los generados no se tocan.
  const codeUpdate = supplier.usesOwnCodes
    ? { code: normalizeCode(parsed.data.code), codeIsGenerated: false }
    : {};

  try {
    await db
      .update(products)
      .set({ ...dbValues, ...codeUpdate })
      .where(and(eq(products.id, id), tenantEq(products, tenant)));
  } catch (error) {
    if (isUniqueViolation(error)) return { error: DUPLICATE_CODE };
    throw error;
  }

  revalidatePath("/panel/articulos");
  revalidatePath(`/panel/articulos/${id}/editar`);
  return { ok: true, id };
}
