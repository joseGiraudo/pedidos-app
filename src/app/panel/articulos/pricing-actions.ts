"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { priceChanges, products } from "@/db/schema";
import { fromCents, toCents } from "@/lib/pricing";
import { getCurrentActor } from "@/lib/session";
import { assertOwned, tenantEq } from "@/lib/tenant";
import { parseArgNumber } from "@/lib/validations/catalog";
import { inlinePriceSchema, priceStringSchema, type PriceField } from "@/lib/validations/pricing";

export type PricingResult = { ok: true } | { error: string };

const SESSION_EXPIRED = "Tu sesión expiró. Volvé a iniciar sesión.";
const INVALID = "Revisá el precio ingresado.";

// Edición directa de un precio desde la lista. Graba el cambio en `price_changes`
// (historial desde el día 1; `batch_id` NULL = edición individual) y actualiza el
// producto, todo en una transacción. El supplier_id sale de la sesión, nunca del cliente.
export async function updateProductPrice(
  id: string,
  field: PriceField,
  value: string,
): Promise<PricingResult> {
  const actor = await getCurrentActor();
  if (!actor) return { error: SESSION_EXPIRED };

  const parsed = inlinePriceSchema.safeParse({ field, value });
  if (!parsed.success) return { error: INVALID };
  // El mayorista es obligatorio; el minorista puede quedar vacío (= NULL, hereda mayorista).
  if (!priceStringSchema(field === "wholesale").safeParse(value).success) {
    return { error: INVALID };
  }

  const trimmed = value.trim();
  const newValue =
    field === "retail" && trimmed === "" ? null : fromCents(toCents(parseArgNumber(trimmed) ?? 0));

  const [existing] = await db
    .select({
      id: products.id,
      supplierId: products.supplierId,
      wholesalePrice: products.wholesalePrice,
      retailPrice: products.retailPrice,
    })
    .from(products)
    .where(and(eq(products.id, id), tenantEq(products, actor)))
    .limit(1);
  assertOwned(existing, actor);

  const newWholesale = field === "wholesale" ? (newValue as string) : existing.wholesalePrice;
  const newRetail = field === "retail" ? newValue : existing.retailPrice;

  // Sin cambios: no ensuciamos el historial con un registro espurio.
  if (newWholesale === existing.wholesalePrice && newRetail === existing.retailPrice) {
    return { ok: true };
  }

  await db.transaction(async (tx) => {
    // price_changes no tiene supplier_id: hereda la tenencia de products (ver DECISIONES.md).
    await tx.insert(priceChanges).values({
      productId: id,
      batchId: null,
      oldWholesale: existing.wholesalePrice,
      newWholesale,
      oldRetail: existing.retailPrice,
      newRetail,
      createdBy: actor.userId,
    });
    await tx
      .update(products)
      .set({ wholesalePrice: newWholesale, retailPrice: newRetail })
      .where(and(eq(products.id, id), tenantEq(products, actor)));
  });

  revalidatePath("/panel/articulos");
  return { ok: true };
}
