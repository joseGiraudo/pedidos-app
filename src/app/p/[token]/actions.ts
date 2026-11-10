"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { brands, categories, orderItems, products } from "@/db/schema";
import { resolveCustomerByToken } from "@/lib/customer-access";
import { getOrCreateDraft, recomputeDraftTotals } from "@/lib/order-draft";
import { computeLine, selectListPriceCents } from "@/lib/order-pricing";
import { fromCents } from "@/lib/pricing";

export type DraftResult = { ok: true } | { error: string };

const LINK_INACTIVE = "Este link ya no está activo.";
const INVALID = "No pudimos actualizar tu pedido. Probá de nuevo.";
const NOT_AVAILABLE = "Ese artículo ya no está disponible.";

// Actions públicas del pedido del kiosquero. No hay sesión: el token identifica al cliente.
// Cada action resuelve el token en el servidor y nunca confía en supplierId/precios del cliente.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Error de negocio dentro de una transacción, para traducir a `{ error }` sin romper la tx. */
class ActionError extends Error {}

const setItemSchema = z.object({
  productId: z.string().regex(UUID_RE),
  // Cantidad en unidades, piezas o kg (numeric(10,3)); 0 elimina la línea.
  quantity: z.number().min(0).max(100000),
});

/**
 * Agrega, actualiza o elimina (cantidad 0) una línea del borrador del cliente. Valida que el
 * artículo pertenezca al proveedor del cliente y esté disponible; recalcula los totales.
 */
export async function setDraftItem(
  token: string,
  productId: string,
  quantity: number,
): Promise<DraftResult> {
  const customer = await resolveCustomerByToken(token);
  if (!customer) return { error: LINK_INACTIVE };

  const parsed = setItemSchema.safeParse({ productId, quantity });
  if (!parsed.success) return { error: INVALID };

  // Cantidad normalizada a 3 decimales (precisión de numeric(10,3)).
  const qty = Math.round(parsed.data.quantity * 1000) / 1000;

  try {
    await db.transaction(async (tx) => {
      const [product] = await tx
        .select({
          id: products.id,
          code: products.code,
          name: products.name,
          presentation: products.presentation,
          brandName: brands.name,
          categoryName: categories.name,
          pricingUnit: products.pricingUnit,
          orderMode: products.orderMode,
          avgPieceWeightKg: products.avgPieceWeightKg,
          wholesalePrice: products.wholesalePrice,
          retailPrice: products.retailPrice,
          isAvailable: products.isAvailable,
          isActive: products.isActive,
        })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.id, parsed.data.productId), eq(products.supplierId, customer.supplierId)))
        .limit(1);

      if (!product || !product.isActive) throw new ActionError(NOT_AVAILABLE);

      const draftId = await getOrCreateDraft(tx, customer);

      if (qty === 0) {
        await tx
          .delete(orderItems)
          .where(and(eq(orderItems.orderId, draftId), eq(orderItems.productId, product.id)));
        await recomputeDraftTotals(tx, draftId, customer);
        return;
      }

      // Agregar/subir cantidad sólo si hay stock; bajar o quitar siempre se permite.
      if (!product.isAvailable) throw new ActionError(NOT_AVAILABLE);

      const line = computeLine({
        listPriceCents: selectListPriceCents(product, customer.priceList),
        discountPct: Number(customer.discountPct),
        quantity: qty,
        orderMode: product.orderMode,
        avgPieceWeightKg: product.avgPieceWeightKg === null ? null : Number(product.avgPieceWeightKg),
      });

      const snapshot = {
        code: product.code,
        name: product.name,
        presentation: product.presentation,
        brandName: product.brandName,
        categoryName: product.categoryName,
        pricingUnit: product.pricingUnit,
        orderMode: product.orderMode,
        unitPrice: fromCents(line.unitPriceCents),
        quantity: qty.toFixed(3),
        originalQuantity: qty.toFixed(3),
        estimatedWeightKg: line.estimatedWeightKg === null ? null : line.estimatedWeightKg.toFixed(3),
        estimatedLineTotal: fromCents(line.estimatedLineTotalCents),
      };

      const [existing] = await tx
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(and(eq(orderItems.orderId, draftId), eq(orderItems.productId, product.id)))
        .limit(1);

      if (existing) {
        await tx.update(orderItems).set(snapshot).where(eq(orderItems.id, existing.id));
      } else {
        await tx.insert(orderItems).values({ orderId: draftId, productId: product.id, ...snapshot });
      }

      await recomputeDraftTotals(tx, draftId, customer);
    });
  } catch (error) {
    if (error instanceof ActionError) return { error: error.message };
    throw error;
  }

  return { ok: true };
}

/** Vacía el borrador del cliente (elimina sus líneas). */
export async function clearDraft(token: string): Promise<DraftResult> {
  const customer = await resolveCustomerByToken(token);
  if (!customer) return { error: LINK_INACTIVE };

  await db.transaction(async (tx) => {
    const draftId = await getOrCreateDraft(tx, customer);
    await tx.delete(orderItems).where(eq(orderItems.orderId, draftId));
    await recomputeDraftTotals(tx, draftId, customer);
  });

  return { ok: true };
}

