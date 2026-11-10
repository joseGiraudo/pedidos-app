import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";

import type { CustomerAccess } from "./customer-access";
import { computeLine, computeOrderTotals, selectListPriceCents } from "./order-pricing";
import { fromCents, toCents } from "./pricing";

// Lectura y recálculo del borrador del cliente. El borrador vive en `orders` (status=draft,
// number=NULL) + `order_items`; un solo borrador por cliente. Las cantidades de línea se
// guardan con las copias del artículo y el precio del momento (snapshot); al mostrar el
// carrito se recalcula con los precios VIGENTES (regla: el borrador muestra precios vigentes)
// y se detecta si cambiaron respecto del snapshot.

/** Ejecutor de consultas: `db` o una transacción (`tx`) con la misma API. */
export type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

export type DraftLineView = {
  productId: string;
  code: string;
  name: string;
  presentation: string | null;
  pricingUnit: "unit" | "kg";
  orderMode: "unit" | "piece" | "kg";
  quantity: string;
  unitPrice: string;
  estimatedWeightKg: string | null;
  estimatedLineTotal: string;
  /** El precio vigente difiere del snapshot guardado en el borrador. */
  priceChanged: boolean;
  /** El artículo quedó sin stock o dado de baja: bloquea el envío. */
  blocked: boolean;
};

export type DraftView = {
  draftId: string;
  lines: DraftLineView[];
  subtotal: string;
  discountAmount: string;
  estimatedTotal: string;
  hasPriceChange: boolean;
  hasBlocked: boolean;
};

/** Id del borrador del cliente; lo crea si no existe. Corre dentro del `tx` recibido. */
export async function getOrCreateDraft(tx: Executor, customer: CustomerAccess): Promise<string> {
  const [existing] = await tx
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.customerId, customer.id), eq(orders.status, "draft")))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await tx
    .insert(orders)
    .values({
      supplierId: customer.supplierId,
      customerId: customer.id,
      status: "draft",
      createdBy: "customer",
      priceList: customer.priceList,
      discountPct: customer.discountPct,
    })
    .returning({ id: orders.id });
  return created.id;
}

/** Borrador vigente del cliente, o `null` si no tiene. */
export async function findDraft(customerId: string): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.customerId, customerId), eq(orders.status, "draft")))
    .limit(1);
  return row ?? null;
}

/** Cantidades del borrador por `productId` (para hidratar el catálogo), y el id del borrador. */
export async function getDraftQuantities(
  customerId: string,
): Promise<{ draftId: string | null; quantities: Record<string, string> }> {
  const draft = await findDraft(customerId);
  if (!draft) return { draftId: null, quantities: {} };

  const rows = await db
    .select({ productId: orderItems.productId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, draft.id));

  const quantities: Record<string, string> = {};
  for (const r of rows) quantities[r.productId] = r.quantity;
  return { draftId: draft.id, quantities };
}

/**
 * Vista completa del borrador con precios vigentes, totales y banderas de cambio de precio y
 * de artículos no disponibles. `null` si el cliente no tiene borrador o está vacío.
 */
export async function loadDraftView(customer: CustomerAccess): Promise<DraftView | null> {
  const draft = await findDraft(customer.id);
  if (!draft) return null;

  const rows = await db
    .select({
      productId: orderItems.productId,
      snapshotUnitPrice: orderItems.unitPrice,
      quantity: orderItems.quantity,
      // Datos vigentes del artículo.
      code: products.code,
      name: products.name,
      presentation: products.presentation,
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
    .where(eq(orderItems.orderId, draft.id))
    .orderBy(products.name);

  if (rows.length === 0) return null;

  const lines: DraftLineView[] = rows.map((r) => {
    const listPriceCents = selectListPriceCents(r, customer.priceList);
    const line = computeLine({
      listPriceCents,
      discountPct: Number(customer.discountPct),
      quantity: Number(r.quantity),
      orderMode: r.orderMode,
      avgPieceWeightKg: r.avgPieceWeightKg === null ? null : Number(r.avgPieceWeightKg),
    });
    const priceChanged = line.unitPriceCents !== toCents(r.snapshotUnitPrice);
    return {
      productId: r.productId,
      code: r.code,
      name: r.name,
      presentation: r.presentation,
      pricingUnit: r.pricingUnit,
      orderMode: r.orderMode,
      quantity: r.quantity,
      unitPrice: fromCents(line.unitPriceCents),
      estimatedWeightKg: line.estimatedWeightKg === null ? null : line.estimatedWeightKg.toFixed(3),
      estimatedLineTotal: fromCents(line.estimatedLineTotalCents),
      priceChanged,
      blocked: !r.isAvailable || !r.isActive,
    };
  });

  const totals = computeOrderTotals(
    rows.map((r) => {
      const listPriceCents = selectListPriceCents(r, customer.priceList);
      return computeLine({
        listPriceCents,
        discountPct: Number(customer.discountPct),
        quantity: Number(r.quantity),
        orderMode: r.orderMode,
        avgPieceWeightKg: r.avgPieceWeightKg === null ? null : Number(r.avgPieceWeightKg),
      });
    }),
  );

  return {
    draftId: draft.id,
    lines,
    subtotal: fromCents(totals.subtotalCents),
    discountAmount: fromCents(totals.discountAmountCents),
    estimatedTotal: fromCents(totals.estimatedTotalCents),
    hasPriceChange: lines.some((l) => l.priceChanged),
    hasBlocked: lines.some((l) => l.blocked),
  };
}

/**
 * Recalcula y persiste los totales del borrador desde los precios VIGENTES de sus líneas.
 * Corre dentro de la transacción del `tx` recibido.
 */
export async function recomputeDraftTotals(
  tx: Executor,
  draftId: string,
  customer: CustomerAccess,
): Promise<void> {
  const rows = await tx
    .select({
      quantity: orderItems.quantity,
      orderMode: products.orderMode,
      avgPieceWeightKg: products.avgPieceWeightKg,
      wholesalePrice: products.wholesalePrice,
      retailPrice: products.retailPrice,
    })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, draftId));

  const totals = computeOrderTotals(
    rows.map((r) =>
      computeLine({
        listPriceCents: selectListPriceCents(r, customer.priceList),
        discountPct: Number(customer.discountPct),
        quantity: Number(r.quantity),
        orderMode: r.orderMode,
        avgPieceWeightKg: r.avgPieceWeightKg === null ? null : Number(r.avgPieceWeightKg),
      }),
    ),
  );

  await tx
    .update(orders)
    .set({
      subtotal: fromCents(totals.subtotalCents),
      discountAmount: fromCents(totals.discountAmountCents),
      estimatedTotal: fromCents(totals.estimatedTotalCents),
    })
    .where(eq(orders.id, draftId));
}
