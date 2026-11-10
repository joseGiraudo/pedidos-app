// Cálculo del pedido del cliente. Lógica pura, sin DB ni React (ver order-pricing.test.ts).
// Reglas (docs/reglas-de-negocio.md):
// - Dinero en CENTAVOS enteros (reutiliza pricing.ts) para no arrastrar float.
// - Orden del cálculo: precio de la lista del cliente → descuento del cliente → total.
// - Si `retail_price` está vacío, se usa `wholesale_price`.
// - El redondeo a pesos NO se aplica sobre descuentos (sólo al actualizar listas de precio).
// - Por peso: estimado = piezas × peso promedio × precio/kg.

import { toCents } from "./pricing";

export type PriceList = "wholesale" | "retail";
export type OrderMode = "unit" | "piece" | "kg";

export type ProductForPricing = {
  wholesalePrice: string;
  retailPrice: string | null;
};

/** Precio de la lista del cliente en centavos. `retail` NULL usa el mayorista. */
export function selectListPriceCents(product: ProductForPricing, priceList: PriceList): number {
  if (priceList === "retail" && product.retailPrice !== null) {
    return toCents(product.retailPrice);
  }
  return toCents(product.wholesalePrice);
}

/** Redondea a 3 decimales (precisión de `numeric(10,3)` para cantidades/pesos). */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Aplica el descuento del cliente a un precio en centavos. No redondea a pesos. */
function applyDiscountCents(cents: number, discountPct: number): number {
  return Math.round(cents * (1 - discountPct / 100));
}

export type LineInput = {
  listPriceCents: number;
  /** Descuento del cliente, 0..100. */
  discountPct: number;
  /** Cantidad pedida: unidades, piezas o kg según `orderMode`. */
  quantity: number;
  orderMode: OrderMode;
  /** Peso promedio por pieza (kg); requerido cuando `orderMode === "piece"`. */
  avgPieceWeightKg: number | null;
};

export type LineResult = {
  /** Precio con descuento, por unidad o por kg; se congela al enviar (`unit_price`). */
  unitPriceCents: number;
  /** Peso estimado total (kg) sólo cuando se pide por pieza; si no, `null`. */
  estimatedWeightKg: number | null;
  /** Total de la línea con descuento. */
  estimatedLineTotalCents: number;
  /** Total de la línea SIN descuento (para el subtotal del pedido). */
  grossLineTotalCents: number;
};

/**
 * Calcula una línea del pedido. `unit`/`kg`: total = precio × cantidad. `piece`: peso estimado
 * = piezas × peso promedio, y total = precio/kg × peso estimado.
 */
export function computeLine(input: LineInput): LineResult {
  const unitPriceCents = applyDiscountCents(input.listPriceCents, input.discountPct);

  if (input.orderMode === "piece") {
    const estimatedWeightKg = round3(input.quantity * (input.avgPieceWeightKg ?? 0));
    return {
      unitPriceCents,
      estimatedWeightKg,
      estimatedLineTotalCents: Math.round(unitPriceCents * estimatedWeightKg),
      grossLineTotalCents: Math.round(input.listPriceCents * estimatedWeightKg),
    };
  }

  return {
    unitPriceCents,
    estimatedWeightKg: null,
    estimatedLineTotalCents: Math.round(unitPriceCents * input.quantity),
    grossLineTotalCents: Math.round(input.listPriceCents * input.quantity),
  };
}

export type OrderTotalsInput = {
  grossLineTotalCents: number;
  estimatedLineTotalCents: number;
};

export type OrderTotals = {
  subtotalCents: number;
  discountAmountCents: number;
  estimatedTotalCents: number;
};

/**
 * Totales del pedido. `subtotal` = suma de líneas sin descuento; `estimatedTotal` = suma de
 * líneas con descuento (así el total es exactamente la suma de lo mostrado por línea);
 * `discountAmount` = la diferencia.
 */
export function computeOrderTotals(lines: OrderTotalsInput[]): OrderTotals {
  const subtotalCents = lines.reduce((s, l) => s + l.grossLineTotalCents, 0);
  const estimatedTotalCents = lines.reduce((s, l) => s + l.estimatedLineTotalCents, 0);
  return {
    subtotalCents,
    discountAmountCents: subtotalCents - estimatedTotalCents,
    estimatedTotalCents,
  };
}
