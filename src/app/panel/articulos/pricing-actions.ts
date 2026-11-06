"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { priceChanges, priceUpdateBatches, products } from "@/db/schema";
import { computeProductChange, fromCents, toCents } from "@/lib/pricing";
import { getCurrentActor } from "@/lib/session";
import { assertOwned, tenantEq, withTenant } from "@/lib/tenant";
import { parseArgNumber } from "@/lib/validations/catalog";
import {
  inlinePriceSchema,
  priceIncreaseSchema,
  priceStringSchema,
  type PriceField,
  type PriceIncreaseInput,
} from "@/lib/validations/pricing";

export type PricingResult = { ok: true } | { error: string };
export type BatchResult = { ok: true; affectedCount: number } | { error: string };

const SESSION_EXPIRED = "Tu sesión expiró. Volvé a iniciar sesión.";
const INVALID = "Revisá el precio ingresado.";
const INVALID_BATCH = "Revisá los datos del aumento.";
const NO_MATCH = "No se encontraron artículos para actualizar.";

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

// Aumento/rebaja masivo por porcentaje sobre los artículos seleccionados. Crea un
// `price_update_batches` (kind=increase) y, por cada artículo que realmente cambia, un
// `price_changes` que cuelga del batch, todo en una transacción. Los precios se recalculan
// en el servidor con `pricing.ts` (nunca se confía en los que mande el cliente) y solo se
// tocan los productos del proveedor logueado.
export async function applyPriceIncrease(input: PriceIncreaseInput): Promise<BatchResult> {
  const actor = await getCurrentActor();
  if (!actor) return { error: SESSION_EXPIRED };

  const parsed = priceIncreaseSchema.safeParse(input);
  if (!parsed.success) return { error: INVALID_BATCH };
  const { ids, percentage, multiple, mode, target, description } = parsed.data;

  const affected = await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: products.id,
        wholesalePrice: products.wholesalePrice,
        retailPrice: products.retailPrice,
      })
      .from(products)
      .where(and(tenantEq(products, actor), inArray(products.id, ids)));

    // Solo los que efectivamente cambian de precio (evita batches/registros vacíos).
    const changes = rows
      .map((row) => ({
        id: row.id,
        change: computeProductChange(
          { wholesale: row.wholesalePrice, retail: row.retailPrice },
          { percentage, multiple, mode, target },
        ),
      }))
      .filter(
        ({ change }) =>
          change.newWholesale !== change.oldWholesale || change.newRetail !== change.oldRetail,
      );

    if (changes.length === 0) return 0;

    const [batch] = await tx
      .insert(priceUpdateBatches)
      .values(
        withTenant(
          {
            kind: "increase" as const,
            description,
            percentage: percentage.toFixed(2),
            rounding: multiple > 0 ? multiple : null,
            roundingMode: multiple > 0 ? mode : null,
            target,
            affectedCount: changes.length,
            createdBy: actor.userId,
          },
          actor,
        ),
      )
      .returning({ id: priceUpdateBatches.id });

    for (const { id, change } of changes) {
      await tx.insert(priceChanges).values({
        productId: id,
        batchId: batch.id,
        oldWholesale: change.oldWholesale,
        newWholesale: change.newWholesale,
        oldRetail: change.oldRetail,
        newRetail: change.newRetail,
        createdBy: actor.userId,
      });
      await tx
        .update(products)
        .set({ wholesalePrice: change.newWholesale, retailPrice: change.newRetail })
        .where(and(eq(products.id, id), tenantEq(products, actor)));
    }

    return changes.length;
  });

  if (affected === 0) return { error: NO_MATCH };

  revalidatePath("/panel/articulos");
  return { ok: true, affectedCount: affected };
}
