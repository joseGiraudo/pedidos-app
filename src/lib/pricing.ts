// Cálculo de precios: aumentos/rebajas por porcentaje y redondeo. Lógica pura, sin DB ni
// React, para poder testearla (ver pricing.test.ts). Reglas (ver docs):
// - Dinero en `numeric(…,2)`; en TypeScript se opera en CENTAVOS ENTEROS para no arrastrar
//   errores de float (CLAUDE.md).
// - El redondeo solo se aplica al actualizar la lista de precios (reglas-de-negocio.md).
// - El múltiplo de redondeo se expresa en PESOS (10, 50, 100); 0 = sin redondeo.
// - `retail` NULL significa "usa el mayorista": nunca se le asigna un precio propio.

export type RoundingMode = "up" | "nearest";
export type PriceTarget = "wholesale" | "retail" | "both";

/** String `numeric(…,2)` de la base (p. ej. "12500.00") a centavos enteros. */
export function toCents(value: string | number): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) {
    throw new RangeError(`Monto inválido: ${String(value)}`);
  }
  return Math.round(n * 100);
}

/** Centavos enteros a string `numeric(…,2)` para la base. */
export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Aplica un porcentaje (positivo = aumento, negativo = rebaja) y redondea al centavo. */
export function applyPercentage(cents: number, percentage: number): number {
  return Math.round(cents * (1 + percentage / 100));
}

/**
 * Redondea a un múltiplo de `multiplePesos` pesos. `up` = al próximo múltiplo (Math.ceil),
 * `nearest` = al más cercano (Math.round). `multiplePesos <= 0` deja el valor sin redondear.
 * Nunca devuelve negativo.
 */
export function roundToMultiple(
  cents: number,
  multiplePesos: number,
  mode: RoundingMode,
): number {
  if (multiplePesos <= 0) return cents;
  const step = multiplePesos * 100; // múltiplo en centavos
  const quotient = cents / step;
  const rounded = mode === "up" ? Math.ceil(quotient) : Math.round(quotient);
  return Math.max(0, rounded * step);
}

/** Nuevo precio (en centavos) tras aplicar el porcentaje y el redondeo elegidos. */
export function computeNewPriceCents(
  currentCents: number,
  percentage: number,
  multiplePesos: number,
  mode: RoundingMode,
): number {
  return roundToMultiple(applyPercentage(currentCents, percentage), multiplePesos, mode);
}

/** Precios actuales de un artículo, como llegan de la base (strings `numeric`). */
export type ProductPrices = { wholesale: string; retail: string | null };

/** Parámetros de un aumento/rebaja masivo. `multiple` en pesos (0 = sin redondeo). */
export type IncreaseParams = {
  percentage: number;
  multiple: number;
  mode: RoundingMode;
  target: PriceTarget;
};

/** Precios antes/después de un artículo, listos para grabar en `price_changes`. */
export type PriceChange = {
  oldWholesale: string;
  newWholesale: string;
  oldRetail: string | null;
  newRetail: string | null;
};

/**
 * Calcula los precios nuevos de un artículo según el target y el redondeo. El mayorista y
 * el minorista solo cambian si el target los incluye. Un minorista NULL se deja en NULL
 * (hereda del mayorista); nunca se le crea un precio propio.
 */
export function computeProductChange(
  current: ProductPrices,
  params: IncreaseParams,
): PriceChange {
  const touchesWholesale = params.target === "wholesale" || params.target === "both";
  const touchesRetail = params.target === "retail" || params.target === "both";

  const oldWholesaleCents = toCents(current.wholesale);
  const newWholesaleCents = touchesWholesale
    ? computeNewPriceCents(oldWholesaleCents, params.percentage, params.multiple, params.mode)
    : oldWholesaleCents;

  const oldRetailCents = current.retail === null ? null : toCents(current.retail);
  const newRetailCents =
    oldRetailCents === null
      ? null
      : touchesRetail
        ? computeNewPriceCents(oldRetailCents, params.percentage, params.multiple, params.mode)
        : oldRetailCents;

  return {
    oldWholesale: current.wholesale,
    newWholesale: fromCents(newWholesaleCents),
    oldRetail: current.retail,
    newRetail: newRetailCents === null ? null : fromCents(newRetailCents),
  };
}
