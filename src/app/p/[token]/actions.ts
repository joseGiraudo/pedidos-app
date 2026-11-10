"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { brands, categories, orderEvents, orderItems, orders, products, suppliers } from "@/db/schema";
import { resolveCustomerByToken, resolveCustomerContext } from "@/lib/customer-access";
import { buildCustomerLink } from "@/lib/customer-link";
import { getOrCreateDraft, recomputeDraftTotals } from "@/lib/order-draft";
import { buildOrderMessage, buildOrderWhatsappUrl, type OrderMessageLine } from "@/lib/order-message";
import { computeLine, computeOrderTotals, selectListPriceCents } from "@/lib/order-pricing";
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

export type SendResult =
  | { ok: true; number: number; whatsappUrl: string | null }
  | { error: string };

const EMPTY = "Tu pedido está vacío.";

/**
 * Envía el borrador: recalcula desde los precios vigentes, congela copias y precios, asigna
 * número (con lock) y lo pasa a `sent`. Devuelve el `wa.me` del proveedor para abrir WhatsApp.
 * Todo en una transacción; nunca confía en precios del cliente.
 */
export async function sendOrder(token: string, notes: string): Promise<SendResult> {
  const ctx = await resolveCustomerContext(token);
  if (!ctx) return { error: LINK_INACTIVE };
  const customer = ctx.customer;
  const cleanNotes = (notes ?? "").trim().slice(0, 500);

  try {
    const sent = await db.transaction(async (tx) => {
      const [draft] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.customerId, customer.id), eq(orders.status, "draft")))
        .limit(1);
      if (!draft) throw new ActionError(EMPTY);

      const rows = await tx
        .select({
          itemId: orderItems.id,
          quantity: orderItems.quantity,
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
        .from(orderItems)
        .innerJoin(products, eq(products.id, orderItems.productId))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(orderItems.orderId, draft.id));

      if (rows.length === 0) throw new ActionError(EMPTY);

      const blocked = rows.filter((r) => !r.isAvailable || !r.isActive).map((r) => r.name);
      if (blocked.length > 0) {
        throw new ActionError(`Quitá los artículos que ya no están disponibles: ${blocked.join(", ")}.`);
      }

      const messageLines: OrderMessageLine[] = [];
      const totalsInput = rows.map((r) => {
        const line = computeLine({
          listPriceCents: selectListPriceCents(r, customer.priceList),
          discountPct: Number(customer.discountPct),
          quantity: Number(r.quantity),
          orderMode: r.orderMode,
          avgPieceWeightKg: r.avgPieceWeightKg === null ? null : Number(r.avgPieceWeightKg),
        });
        return { line, row: r };
      });

      // Congelar copias y precios en cada línea.
      for (const { line, row } of totalsInput) {
        messageLines.push({
          quantity: row.quantity,
          name: row.name,
          presentation: row.presentation,
          orderMode: row.orderMode,
          estimatedWeightKg: line.estimatedWeightKg === null ? null : line.estimatedWeightKg.toFixed(3),
          estimatedLineTotal: fromCents(line.estimatedLineTotalCents),
        });
        await tx
          .update(orderItems)
          .set({
            code: row.code,
            name: row.name,
            presentation: row.presentation,
            brandName: row.brandName,
            categoryName: row.categoryName,
            pricingUnit: row.pricingUnit,
            orderMode: row.orderMode,
            unitPrice: fromCents(line.unitPriceCents),
            originalQuantity: row.quantity,
            estimatedWeightKg: line.estimatedWeightKg === null ? null : line.estimatedWeightKg.toFixed(3),
            estimatedLineTotal: fromCents(line.estimatedLineTotalCents),
          })
          .where(eq(orderItems.id, row.itemId));
      }

      const totals = computeOrderTotals(totalsInput.map((t) => t.line));

      // Número del pedido con lock sobre el proveedor (patrón de createProduct).
      const [{ next }] = await tx
        .select({ next: suppliers.nextOrderNumber })
        .from(suppliers)
        .where(eq(suppliers.id, customer.supplierId))
        .for("update");
      await tx
        .update(suppliers)
        .set({ nextOrderNumber: next + 1 })
        .where(eq(suppliers.id, customer.supplierId));

      await tx
        .update(orders)
        .set({
          status: "sent",
          number: next,
          sentAt: new Date(),
          customerNotes: cleanNotes === "" ? null : cleanNotes,
          subtotal: fromCents(totals.subtotalCents),
          discountAmount: fromCents(totals.discountAmountCents),
          estimatedTotal: fromCents(totals.estimatedTotalCents),
          version: sql`${orders.version} + 1`,
        })
        .where(eq(orders.id, draft.id));

      await tx.insert(orderEvents).values({
        orderId: draft.id,
        supplierId: customer.supplierId,
        eventType: "sent",
        fromStatus: "draft",
        toStatus: "sent",
        actor: "customer",
      });

      return { number: next, messageLines, estimatedTotal: fromCents(totals.estimatedTotalCents) };
    });

    const baseUrl = (process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "");
    const orderLink = `${buildCustomerLink(baseUrl, token)}/pedidos/${sent.number}`;
    const message = buildOrderMessage({
      number: sent.number,
      businessName: customer.businessName,
      date: new Date(),
      lines: sent.messageLines,
      estimatedTotal: sent.estimatedTotal,
      notes: cleanNotes === "" ? null : cleanNotes,
      orderLink,
    });
    const whatsappUrl = buildOrderWhatsappUrl(ctx.supplier.whatsappPhone, message);

    return { ok: true, number: sent.number, whatsappUrl };
  } catch (error) {
    if (error instanceof ActionError) return { error: error.message };
    throw error;
  }
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

